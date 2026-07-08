import { App, PluginSettingTab, type SettingDefinitionItem } from 'obsidian';
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

	getControlValue(key: string): unknown {
		return this.plugin.settings[key as keyof LynxSettings];
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		(this.plugin.settings as unknown as Record<string, unknown>)[key] = value;
		await this.plugin.saveSettings();
	}

	getSettingDefinitions(): SettingDefinitionItem<keyof LynxSettings>[] {
		return [
			{
				name: 'Default sort order',
				desc: 'How links are ordered when the view first opens.',
				control: {
					type: 'dropdown',
					key: 'defaultSort',
					options: {
						'modified-desc': 'Modified date (newest first)',
						'modified-asc': 'Modified date (oldest first)',
						'name-asc': 'Name (a → z)',
						'name-desc': 'Name (z → a)',
						'type-asc': 'Type (incoming first)',
						'type-desc': 'Type (outgoing first)',
					},
				},
			},
			{
				name: 'Show unresolved links',
				desc: 'Include links that do not yet point to an existing note.',
				control: {
					type: 'toggle',
					key: 'showUnresolved',
				},
			},
			{
				name: 'Open on startup',
				desc: 'Open the links view automatically when Obsidian loads.',
				control: {
					type: 'toggle',
					key: 'openOnStartup',
				},
			},
		];
	}
}
