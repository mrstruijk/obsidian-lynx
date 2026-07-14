import { App, MetadataCache, ReferenceCache, TFile } from 'obsidian';

interface MetadataCacheInternal extends MetadataCache {
	getBacklinksForFile(file: TFile): { data: Map<string, ReferenceCache[]> } | null;
}

function getLinkBasename(linkText: string): string {
	// Strip optional block/heading subpath, extension, and parent folders.
	const base = linkText.split(/[#^]/, 1)[0] ?? linkText;
	const name = base.split('/').pop() ?? base;
	return name.replace(/\.md$/i, '');
}

function extractSubpath(linkText: string): string | undefined {
	const match = linkText.match(/[#^](.+)$/);
	return match?.[1];
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
	linkSubpath?: string;
	position?: {
		start: { line: number; col: number };
		end: { line: number; col: number };
	};
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
			refs: (ReferenceCache | { link: string })[],
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
		for (const [sourcePath, refs] of backlinks.data.entries()) {
			const sourceFile = app.vault.getAbstractFileByPath(sourcePath);
			if (!(sourceFile instanceof TFile)) continue;

			for (const ref of refs) {
				const subpath = extractSubpath(ref.link);
				const dedupeKey = [
					sourcePath.toLowerCase(),
					subpath ?? '',
					ref.position?.start?.line ?? 0,
					ref.position?.start?.col ?? 0,
				].join('|');
				if (seen.has(dedupeKey)) continue;
				seen.add(dedupeKey);

				items.push({
					type: 'incoming',
					path: sourcePath,
					displayName: sourceFile.basename,
					resolved: true,
					file: sourceFile,
					mtime: sourceFile.stat.mtime,
					source: 'body',
					linkSubpath: subpath,
					position: ref.position,
				});
			}
		}
	}

	return items;
}
