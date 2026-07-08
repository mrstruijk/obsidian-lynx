import { ItemView, WorkspaceLeaf, TFile, setIcon, Menu } from 'obsidian';
import LynxPlugin from './main';
import { collectLinks, LinkItem } from './links-collector';
import { SortOrder } from './settings';

export const VIEW_TYPE = 'lynx-links-view';

export class LynxLinksView extends ItemView {
	plugin: LynxPlugin;
	private currentFile: TFile | null = null;
	private currentSort: SortOrder;
	private headerTitle!: HTMLElement;
	private sortSelect!: HTMLSelectElement;
	private listContainer!: HTMLElement;

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

		const header = this.contentEl.createDiv({ cls: 'lynx-links-header' });
		this.headerTitle = header.createEl('h4', { text: 'No active note' });

		const controls = this.contentEl.createDiv({ cls: 'lynx-links-controls' });
		this.sortSelect = controls.createEl('select');

		const options: Record<SortOrder, string> = {
			'modified-desc': 'Modified (newest)',
			'modified-asc': 'Modified (oldest)',
			'name-asc': 'Name (a → z)',
			'name-desc': 'Name (z → a)',
			'type-asc': 'Type (incoming first)',
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
		this.render();
	}

	private render(): void {
		if (!this.listContainer) return;
		this.listContainer.empty();

		if (!this.currentFile) {
			this.headerTitle.setText('No active note');
			return;
		}

		this.headerTitle.setText(this.currentFile.basename);

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

		const icon = row.createSpan({ cls: 'lynx-link-icon' });
		setIcon(icon, item.type === 'incoming' ? 'arrow-left' : 'arrow-right');

		row.createSpan({
			cls: 'lynx-link-label',
			text: item.displayName,
		});

		row.addEventListener('click', () => {
			void this.plugin.app.workspace.openLinkText(
				item.path,
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
			const cmp = a.type.localeCompare(b.type);
			if (cmp !== 0) return cmp * dir;
		}
		return a.displayName.localeCompare(b.displayName);
	});
}
