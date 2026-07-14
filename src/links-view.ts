import { ItemView, WorkspaceLeaf, TFile, setIcon, Menu } from 'obsidian';
import LynxPlugin from './main';
import { collectLinks, LinkItem, LinkType } from './links-collector';
import { openLinkItem } from './open-link';
import { LynxSettings, SortOrder } from './settings';

const LYNX_LINK_COLOR_VAR = '--lynx-link-color';

export const VIEW_TYPE = 'lynx-links-view';

export class LynxLinksView extends ItemView {
	plugin: LynxPlugin;
	private currentFile: TFile | null = null;
	private currentSort: SortOrder;
	private sortSelect!: HTMLSelectElement;
	private listContainer!: HTMLElement;
	private backButton!: HTMLElement;
	private forwardButton!: HTMLElement;
	private history: TFile[] = [];
	private historyIndex = -1;
	private navigatingHistory = false;

	constructor(leaf: WorkspaceLeaf, plugin: LynxPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.currentSort = plugin.settings.defaultSort;
	}

	getViewType(): string {
		return VIEW_TYPE;
	}

	getDisplayText(): string {
		return 'Links';
	}

	getIcon(): string {
		return 'link';
	}

	async onOpen(): Promise<void> {
		this.contentEl.empty();
		this.contentEl.addClass('lynx-links-view');

		const toolbar = this.contentEl.createDiv({ cls: 'lynx-links-toolbar' });

		this.backButton = toolbar.createSpan({ cls: 'lynx-history-btn' });
		setIcon(this.backButton, 'chevron-left');
		this.backButton.setAttribute('aria-label', 'Back');
		this.backButton.addEventListener('click', () => this.goBack());

		this.forwardButton = toolbar.createSpan({ cls: 'lynx-history-btn' });
		setIcon(this.forwardButton, 'chevron-right');
		this.forwardButton.setAttribute('aria-label', 'Forward');
		this.forwardButton.addEventListener('click', () => this.goForward());

		const controls = toolbar.createDiv({ cls: 'lynx-links-controls' });
		this.sortSelect = controls.createEl('select');

		const options: Record<SortOrder, string> = {
			'modified-desc': 'Modified (newest)',
			'modified-asc': 'Modified (oldest)',
			'name-asc': 'Name (a → z)',
			'name-desc': 'Name (z → a)',
			'type-asc': 'Type (bidirectional first)',
			'type-desc': 'Type (outgoing first)',
		};

		for (const [value, label] of Object.entries(options)) {
			this.sortSelect.createEl('option', { text: label, value });
		}

		this.sortSelect.value = this.currentSort;
		this.sortSelect.addEventListener('change', () => {
			this.currentSort = this.sortSelect.value as SortOrder;
			this.plugin.settings.defaultSort = this.currentSort;
			void this.plugin.saveSettings();
			this.render();
		});

		this.listContainer = this.contentEl.createDiv({ cls: 'lynx-links-list' });

		this.update(this.plugin.app.workspace.getActiveFile());
	}

	update(file: TFile | null): void {
		this.currentFile = file;

		// Seed history on first update or when file changes externally
		if (file && !this.navigatingHistory) {
			this.pushHistory(file.path);
		}

		this.render();
	}

	refresh(): void {
		this.currentSort = this.plugin.settings.defaultSort;
		if (this.sortSelect) {
			this.sortSelect.value = this.currentSort;
		}
		this.render();
	}

	private render(): void {
		if (!this.listContainer) return;
		this.listContainer.empty();

		if (!this.currentFile) {
			return;
		}

		let items = collectLinks(this.currentFile, this.plugin.app, {
			showUnresolved: this.plugin.settings.showUnresolved,
		});

		items = sortItems(items, this.currentSort);

		if (items.length === 0) {
			this.listContainer.createDiv({
				cls: 'lynx-links-empty',
				text: 'No links found.',
			});
			return;
		}

		for (const item of items) {
			this.renderItem(item);
		}
	}

	private renderItem(item: LinkItem): void {
		const row = this.listContainer.createDiv({
			cls: `lynx-link lynx-link--${item.type}${
				item.resolved ? '' : ' lynx-link--unresolved'
			}`,
		});
		const typeSettings = getTypeSettings(item.type, this.plugin.settings);
		row.style.setProperty(LYNX_LINK_COLOR_VAR, typeSettings.color);

		const icon = row.createSpan({ cls: 'lynx-link-icon' });
		setIcon(icon, typeSettings.icon);

		row.createSpan({
			cls: 'lynx-link-label',
			text: item.displayName,
		});

		row.addEventListener('click', () => {
			this.pushHistory(item.path);
			void openLinkItem(
				this.plugin.app,
				item,
				this.currentFile?.path ?? '',
			);
		});

		row.addEventListener('contextmenu', (event) => {
			const menu = new Menu();
			menu.addItem((m) =>
				m
					.setTitle('Open in new tab')
					.setIcon('file-plus')
					.onClick(() => {
						void this.plugin.app.workspace.openLinkText(
							item.path,
							this.currentFile?.path ?? '',
							'tab',
						);
					}),
			);
			menu.showAtMouseEvent(event);
		});
	}

	private pushHistory(path: string): void {
		const file = this.plugin.app.vault.getAbstractFileByPath(path);
		if (!(file instanceof TFile)) return;

		// Don't push duplicate consecutive entries
		if (this.historyIndex >= 0 && this.history[this.historyIndex]?.path === file.path) {
			return;
		}

		// Truncate forward history
		this.history = this.history.slice(0, this.historyIndex + 1);
		this.history.push(file);
		this.historyIndex = this.history.length - 1;
		this.updateHistoryButtons();
	}

	goBack(): void {
		if (this.historyIndex <= 0) return;
		this.historyIndex--;
		const file = this.history[this.historyIndex];
		if (!file) return;

		this.navigatingHistory = true;
		void this.plugin.app.workspace.openLinkText(file.path, '').finally(() => {
			this.navigatingHistory = false;
		});
		this.updateHistoryButtons();
	}

	goForward(): void {
		if (this.historyIndex >= this.history.length - 1) return;
		this.historyIndex++;
		const file = this.history[this.historyIndex];
		if (!file) return;

		this.navigatingHistory = true;
		void this.plugin.app.workspace.openLinkText(file.path, '').finally(() => {
			this.navigatingHistory = false;
		});
		this.updateHistoryButtons();
	}

	private updateHistoryButtons(): void {
		if (this.historyIndex <= 0) {
			this.backButton.addClass('is-disabled');
		} else {
			this.backButton.removeClass('is-disabled');
		}

		if (this.historyIndex >= this.history.length - 1) {
			this.forwardButton.addClass('is-disabled');
		} else {
			this.forwardButton.removeClass('is-disabled');
		}
	}
}

type SortField = 'modified' | 'name' | 'type';

function sortItems(items: LinkItem[], order: SortOrder): LinkItem[] {
	const [field, direction] = order.split('-') as [SortField, 'asc' | 'desc'];
	const dir = direction === 'asc' ? 1 : -1;

	return [...items].sort((a, b) => {
		if (field === 'modified') {
			const cmp = a.mtime - b.mtime;
			if (cmp !== 0) return cmp * dir;
		}
		if (field === 'type') {
			const rank = { bidirectional: 0, incoming: 1, outgoing: 2 };
			const cmp = rank[a.type] - rank[b.type];
			if (cmp !== 0) return cmp * dir;
		}
		return a.displayName.localeCompare(b.displayName);
	});
}

function getTypeSettings(
	type: LinkType,
	settings: LynxSettings,
): { color: string; icon: string } {
	switch (type) {
		case 'incoming':
			return { color: settings.incomingColor, icon: settings.incomingIcon };
		case 'outgoing':
			return { color: settings.outgoingColor, icon: settings.outgoingIcon };
		case 'bidirectional':
			return {
				color: settings.bidirectionalColor,
				icon: settings.bidirectionalIcon,
			};
	}
}
