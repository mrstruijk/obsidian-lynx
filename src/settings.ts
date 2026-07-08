import { App, PluginSettingTab, Setting } from 'obsidian';
import LynxPlugin from './main';

export type SortOrder =
	| 'modified-desc'
	| 'modified-asc'
	| 'name-asc'
	| 'name-desc'
	| 'type-asc'
	| 'type-desc';

export interface LynxSettings {
	defaultSort: SortOrder;
	showUnresolved: boolean;
	openOnStartup: boolean;
}

export const DEFAULT_SETTINGS: LynxSettings = {
	defaultSort: 'modified-desc',
	showUnresolved: true,
	openOnStartup: false,
};

export class LynxSettingTab extends PluginSettingTab {
	plugin: LynxPlugin;

	constructor(app: App, plugin: LynxPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Default sort order')
			.setDesc('How links are ordered when the view first opens.')
			.addDropdown((dropdown) =>
				dropdown
					.addOption('modified-desc', 'Modified date (newest first)')
					.addOption('modified-asc', 'Modified date (oldest first)')
					.addOption('name-asc', 'Name (a → z)')
					.addOption('name-desc', 'Name (z → a)')
					.addOption('type-asc', 'Type (incoming first)')
					.addOption('type-desc', 'Type (outgoing first)')
					.setValue(this.plugin.settings.defaultSort)
					.onChange(async (value) => {
						this.plugin.settings.defaultSort = value as SortOrder;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Show unresolved links')
			.setDesc('Include links that do not yet point to an existing note.')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showUnresolved)
					.onChange(async (value) => {
						this.plugin.settings.showUnresolved = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Open on startup')
			.setDesc('Open the links view automatically when Obsidian loads.')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.openOnStartup)
					.onChange(async (value) => {
						this.plugin.settings.openOnStartup = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}
