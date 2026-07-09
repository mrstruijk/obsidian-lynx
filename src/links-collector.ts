import { App, MetadataCache, Reference, TFile } from 'obsidian';

interface MetadataCacheInternal extends MetadataCache {
	getBacklinksForFile(file: TFile): { data: Map<string, Reference[]> } | null;
}

function getLinkBasename(linkText: string): string {
	// Strip optional block/heading subpath, extension, and parent folders.
	const base = linkText.split(/[#^]/, 1)[0] ?? linkText;
	const name = base.split('/').pop() ?? base;
	return name.replace(/\.md$/i, '');
}

export type LinkType = 'incoming' | 'outgoing';

export interface LinkItem {
	type: LinkType;
	path: string;
	displayName: string;
	resolved: boolean;
	file?: TFile;
	mtime: number;
	source: 'body' | 'frontmatter';
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
	if (cache) {
		const seen = new Set<string>();

		const addOutgoingLinks = (
			refs: Reference[],
			source: 'body' | 'frontmatter',
		): void => {
			for (const link of refs) {
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
					displayName: resolved ? dest.basename : getLinkBasename(link.link),
					resolved,
					file: resolved ? dest : undefined,
					mtime: resolved ? dest.stat.mtime : 0,
					source,
				});
			}
		};

		addOutgoingLinks(cache.links ?? [], 'body');
		addOutgoingLinks(cache.frontmatterLinks ?? [], 'frontmatter');
	}

	const backlinks = (app.metadataCache as MetadataCacheInternal).getBacklinksForFile(file);
	if (backlinks?.data) {
		const seen = new Set<string>();
		for (const [sourcePath] of backlinks.data.entries()) {
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
				source: 'body',
			});
		}
	}

	return items;
}
