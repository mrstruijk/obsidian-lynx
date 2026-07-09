import { App, SuggestModal, TFile } from 'obsidian';
import LynxPlugin from './main';
import { collectLinks, LinkItem } from './links-collector';

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
		el.createDiv({ text: item.displayName });
		el.createDiv({
			text: item.path,
			cls: 'suggestion-note',
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
