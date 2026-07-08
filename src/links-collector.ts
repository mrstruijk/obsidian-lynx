import { App, MetadataCache, TFile } from 'obsidian';

interface MetadataCacheInternal extends MetadataCache {
	getBacklinksForFile(file: TFile): { data: Record<string, unknown[]> } | null;
}

export type LinkType = 'incoming' | 'outgoing';

export interface LinkItem {
	type: LinkType;
	path: string;
	displayName: string;
	resolved: boolean;
	file?: TFile;
	mtime: number;
}

export interface LynxCollectorSettings {
	showUnresolved: boolean;
}

export function collectLinks(
	file: TFile,
	app: App,
	settings: LynxCollectorSettings,
): LinkItem[] {
	const items: LinkItem[] = [];

	const cache = app.metadataCache.getFileCache(file);
	if (cache?.links) {
		const seen = new Set<string>();
		for (const link of cache.links) {
			const dest = app.metadataCache.getFirstLinkpathDest(link.link, file.path);
			const resolved = dest instanceof TFile;
			const path = resolved ? dest.path : link.link;

			const key = path.toLowerCase();
			if (seen.has(key)) continue;
			seen.add(key);

			if (!resolved && !settings.showUnresolved) continue;

			items.push({
				type: 'outgoing',
				path,
				displayName: link.displayText || link.link,
				resolved,
				file: resolved ? dest : undefined,
				mtime: resolved ? dest.stat.mtime : 0,
			});
		}
	}

	const backlinks = (app.metadataCache as MetadataCacheInternal).getBacklinksForFile(file);
	if (backlinks?.data) {
		const seen = new Set<string>();
		for (const sourcePath of Object.keys(backlinks.data)) {
			const key = sourcePath.toLowerCase();
			if (seen.has(key)) continue;
			seen.add(key);

			const sourceFile = app.vault.getAbstractFileByPath(sourcePath);
			if (!(sourceFile instanceof TFile)) continue;

			items.push({
				type: 'incoming',
				path: sourcePath,
				displayName: sourceFile.basename,
				resolved: true,
				file: sourceFile,
				mtime: sourceFile.stat.mtime,
			});
		}
	}

	return items;
}
