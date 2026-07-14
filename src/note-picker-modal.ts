import { App, setIcon, SuggestModal, TFile } from 'obsidian';
import LynxPlugin from './main';
import { collectLinks, LinkItem, LinkType } from './links-collector';
import { openLinkItem } from './open-link';
import { LynxSettings } from './settings';

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
		const typeSettings = getTypeSettings(item.type, this.plugin.settings);
		el.style.setProperty(LYNX_LINK_COLOR_VAR, typeSettings.color);

		const icon = el.createSpan({ cls: 'lynx-suggestion-icon' });
		setIcon(icon, typeSettings.icon);

		el.createSpan({
			cls: 'lynx-suggestion-title',
			text: item.displayName,
		});
	}

	onChooseSuggestion(item: LinkItem): void {
		const currentFile = this.plugin.app.workspace.getActiveFile();
		void openLinkItem(this.plugin.app, item, currentFile?.path ?? '');
	}
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
