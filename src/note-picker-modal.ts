import { App, setIcon, SuggestModal, TFile } from 'obsidian';
import LynxPlugin from './main';
import { collectLinks, LinkItem } from './links-collector';

const LYNX_LINK_COLOR_VAR = '--lynx-link-color';

export class LynxNotePickerModal extends SuggestModal<LinkItem> {
	plugin: LynxPlugin;
	items: LinkItem[];

	constructor(app: App, plugin: LynxPlugin, currentFile: TFile | null) {
		super(app);
		this.plugin = plugin;
		this.setPlaceholder('Pick a linked note');
		this.items = currentFile
			? collectLinks(currentFile, app, {
					showUnresolved: plugin.settings.showUnresolved,
			  })
			: [];
	}

	getSuggestions(query: string): LinkItem[] {
		const lower = query.toLowerCase();
		return this.items.filter(
			(item) =>
				item.displayName.toLowerCase().includes(lower) ||
				item.path.toLowerCase().includes(lower),
		);
	}

	renderSuggestion(item: LinkItem, el: HTMLElement): void {
		el.addClass('lynx-suggestion');
		el.style.setProperty(
			LYNX_LINK_COLOR_VAR,
			item.type === 'incoming'
				? this.plugin.settings.incomingColor
				: this.plugin.settings.outgoingColor,
		);

		const icon = el.createSpan({ cls: 'lynx-suggestion-icon' });
		setIcon(
			icon,
			item.type === 'incoming'
				? this.plugin.settings.incomingIcon
				: this.plugin.settings.outgoingIcon,
		);

		el.createSpan({
			cls: 'lynx-suggestion-title',
			text: item.displayName,
		});
	}

	onChooseSuggestion(item: LinkItem): void {
		const currentFile = this.plugin.app.workspace.getActiveFile();
		void this.plugin.app.workspace.openLinkText(
			item.path,
			currentFile?.path ?? '',
		);
	}
}
