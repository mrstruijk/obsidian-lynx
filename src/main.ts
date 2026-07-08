import { Plugin, TFile } from 'obsidian';
import { DEFAULT_SETTINGS, LynxSettings, LynxSettingTab } from './settings';
import { LynxLinksView, VIEW_TYPE } from './links-view';

export default class LynxPlugin extends Plugin {
	settings!: LynxSettings;

	async onload() {
		await this.loadSettings();

		this.registerView(VIEW_TYPE, (leaf) => new LynxLinksView(leaf, this));

		this.addCommand({
			id: 'open-links-view',
			name: 'Open links view',
			callback: () => this.openLinksView(),
		});

		this.addSettingTab(new LynxSettingTab(this.app, this));

		this.registerEvent(
			this.app.workspace.on('file-open', (file) => {
				this.updateLinksView(file);
			}),
		);

		if (this.settings.openOnStartup) {
			this.app.workspace.onLayoutReady(() => {
				void this.openLinksView();
			});
		}
	}

	onunload(): void {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<LynxSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async openLinksView(): Promise<void> {
		let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
		if (!leaf) {
			leaf = this.app.workspace.getRightLeaf(false) ?? undefined;
			if (!leaf) return;
		}
		await leaf.setViewState({ type: VIEW_TYPE, active: true });
		await this.app.workspace.revealLeaf(leaf);
		this.updateLinksView(this.app.workspace.getActiveFile());
	}

	updateLinksView(file: TFile | null): void {
		for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
			if (leaf.view instanceof LynxLinksView) {
				leaf.view.update(file);
			}
		}
	}
}
