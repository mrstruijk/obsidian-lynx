import { App, PluginSettingTab, Setting } from 'obsidian';
import LynxPlugin from './main';

export type SortOrder =
	| 'modified-desc'
	| 'modified-asc'
	| 'name-asc'
	| 'name-desc'
	| 'type-bi'
	| 'type-asc'
	| 'type-desc';

export const LYNX_CSS_COLORS = [
	{ value: 'var(--link-color)', label: 'Link' },
	{ value: 'var(--text-accent)', label: 'Accent' },
	{ value: 'var(--text-accent-hover)', label: 'Accent hover' },
	{ value: 'var(--text-normal)', label: 'Normal' },
	{ value: 'var(--text-muted)', label: 'Muted' },
	{ value: 'var(--text-faint)', label: 'Faint' },
	{ value: 'var(--tag-color)', label: 'Tag' },
	{ value: 'var(--text-error)', label: 'Error' },
	{ value: 'var(--text-success)', label: 'Success' },
	{ value: 'var(--text-warning)', label: 'Warning' },
] as const;

export type LynxColor = (typeof LYNX_CSS_COLORS)[number]['value'];

export const LYNX_ICONS = [
	{ value: 'arrow-left', label: 'Arrow left' },
	{ value: 'arrow-right', label: 'Arrow right' },
	{ value: 'arrow-left-right', label: 'Arrow left right' },
	{ value: 'log-in', label: 'Log in' },
	{ value: 'log-out', label: 'Log out' },
	{ value: 'corner-up-left', label: 'Corner up left' },
	{ value: 'corner-up-right', label: 'Corner up right' },
	{ value: 'arrow-big-left', label: 'Big arrow left' },
	{ value: 'arrow-big-right', label: 'Big arrow right' },
] as const;

export type LynxIcon = (typeof LYNX_ICONS)[number]['value'];

export interface LynxSettings {
	defaultSort: SortOrder;
	showUnresolved: boolean;
	openOnStartup: boolean;
	showLineIncoming: boolean;
	showLineOutgoing: boolean;
	showLineBidirectional: boolean;
	incomingColor: LynxColor;
	outgoingColor: LynxColor;
	bidirectionalColor: LynxColor;
	incomingIcon: LynxIcon;
	outgoingIcon: LynxIcon;
	bidirectionalIcon: LynxIcon;
}

export const DEFAULT_SETTINGS: LynxSettings = {
	defaultSort: 'modified-desc',
	showUnresolved: true,
	openOnStartup: false,
	showLineIncoming: true,
	showLineOutgoing: false,
	showLineBidirectional: true,
	incomingColor: 'var(--link-color)',
	outgoingColor: 'var(--text-accent)',
	bidirectionalColor: 'var(--text-accent)',
	incomingIcon: 'arrow-left',
	outgoingIcon: 'arrow-right',
	bidirectionalIcon: 'arrow-left-right',
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
			.addDropdown((dropdown) => {
				dropdown
					.addOption('modified-desc', 'Modified date (newest first)')
					.addOption('modified-asc', 'Modified date (oldest first)')
					.addOption('name-asc', 'Name (a → z)')
					.addOption('name-desc', 'Name (z → a)')
					.addOption('type-bi', 'Type (bidirectional first)')
					.addOption('type-asc', 'Type (incoming first)')
					.addOption('type-desc', 'Type (outgoing first)')
					.setValue(this.plugin.settings.defaultSort)
					.onChange(async (value) => {
						this.plugin.settings.defaultSort = value as SortOrder;
						await this.plugin.saveSettings();
						this.plugin.refreshAllViews();
					});
			});

		new Setting(containerEl)
			.setName('Show unresolved links')
			.setDesc('Include links that do not yet point to an existing note.')
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.showUnresolved)
					.onChange(async (value) => {
						this.plugin.settings.showUnresolved = value;
						await this.plugin.saveSettings();
						this.plugin.refreshAllViews();
					});
			});

		new Setting(containerEl)
			.setName('Open on startup')
			.setDesc('Open the links view automatically when Obsidian loads.')
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.openOnStartup)
					.onChange(async (value) => {
						this.plugin.settings.openOnStartup = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Show line numbers for incoming links')
			.setDesc('Append the source line number to incoming link titles.')
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.showLineIncoming)
					.onChange(async (value) => {
						this.plugin.settings.showLineIncoming = value;
						await this.plugin.saveSettings();
						this.plugin.refreshAllViews();
					});
			});

		new Setting(containerEl)
			.setName('Show line numbers for outgoing links')
			.setDesc('Append the source line number to outgoing link titles.')
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.showLineOutgoing)
					.onChange(async (value) => {
						this.plugin.settings.showLineOutgoing = value;
						await this.plugin.saveSettings();
						this.plugin.refreshAllViews();
					});
			});

		new Setting(containerEl)
			.setName('Show line numbers for bidirectional links')
			.setDesc('Append the source line number to bidirectional link titles.')
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.showLineBidirectional)
					.onChange(async (value) => {
						this.plugin.settings.showLineBidirectional = value;
						await this.plugin.saveSettings();
						this.plugin.refreshAllViews();
					});
			});

		this.addColorSetting(
			containerEl,
			'Incoming link color',
			'Color used for incoming links in the panel.',
			this.plugin.settings.incomingColor,
			(value) => {
				this.plugin.settings.incomingColor = value;
			},
		);

		this.addColorSetting(
			containerEl,
			'Outgoing link color',
			'Color used for outgoing links in the panel.',
			this.plugin.settings.outgoingColor,
			(value) => {
				this.plugin.settings.outgoingColor = value;
			},
		);

		new Setting(containerEl)
			.setName('Incoming link icon')
			.setDesc('Icon used for incoming links in the panel.')
			.addDropdown((dropdown) => {
				for (const { value, label } of LYNX_ICONS) {
					dropdown.addOption(value, label);
				}
				dropdown
					.setValue(this.plugin.settings.incomingIcon)
					.onChange(async (value) => {
						this.plugin.settings.incomingIcon = value as LynxIcon;
						await this.plugin.saveSettings();
						this.plugin.refreshAllViews();
					});
			});

		new Setting(containerEl)
			.setName('Outgoing link icon')
			.setDesc('Icon used for outgoing links in the panel.')
			.addDropdown((dropdown) => {
				for (const { value, label } of LYNX_ICONS) {
					dropdown.addOption(value, label);
				}
				dropdown
					.setValue(this.plugin.settings.outgoingIcon)
					.onChange(async (value) => {
						this.plugin.settings.outgoingIcon = value as LynxIcon;
						await this.plugin.saveSettings();
						this.plugin.refreshAllViews();
					});
			});

		this.addColorSetting(
			containerEl,
			'Bidirectional link color',
			'Color used for links that are both incoming and outgoing.',
			this.plugin.settings.bidirectionalColor,
			(value) => {
				this.plugin.settings.bidirectionalColor = value;
			},
		);

		new Setting(containerEl)
			.setName('Bidirectional link icon')
			.setDesc('Icon used for links that are both incoming and outgoing.')
			.addDropdown((dropdown) => {
				for (const { value, label } of LYNX_ICONS) {
					dropdown.addOption(value, label);
				}
				dropdown
					.setValue(this.plugin.settings.bidirectionalIcon)
					.onChange(async (value) => {
						this.plugin.settings.bidirectionalIcon =
							value as LynxIcon;
						await this.plugin.saveSettings();
						this.plugin.refreshAllViews();
					});
			});
	}

	addColorSetting(
		containerEl: HTMLElement,
		name: string,
		desc: string,
		initialValue: LynxColor,
		updateSetting: (value: LynxColor) => void,
	): void {
		let previewEl: HTMLElement | null = null;

		new Setting(containerEl)
			.setName(name)
			.setDesc(desc)
			.addDropdown((dropdown) => {
				for (const { value, label } of LYNX_CSS_COLORS) {
					dropdown.addOption(value, label);
				}

				previewEl =
					dropdown.selectEl.parentElement?.createDiv({
						cls: 'lynx-color-preview',
					}) ?? null;

				const updatePreview = (value: LynxColor): void => {
					previewEl?.style.setProperty('background-color', value);
				};

				updatePreview(initialValue);

				dropdown.setValue(initialValue).onChange(async (value) => {
					const color = value as LynxColor;
					updateSetting(color);
					updatePreview(color);
					await this.plugin.saveSettings();
					this.plugin.refreshAllViews();
				});
			});
	}
}
