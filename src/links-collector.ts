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

export type LinkType = 'incoming' | 'outgoing' | 'bidirectional';

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
	const itemsByPath = new Map<string, LinkItem>();

	function setPathItem(path: string, item: LinkItem): void {
		itemsByPath.set(path.toLowerCase(), item);
	}

	function getPathItem(path: string): LinkItem | undefined {
		return itemsByPath.get(path.toLowerCase());
	}

	const cache = app.metadataCache.getFileCache(file);
	if (cache) {
			const addOutgoingLinks = (
				refs: (ReferenceCache | { link: string })[],
				source: 'body' | 'frontmatter',
			): void => {
				for (const link of refs) {
					const dest = app.metadataCache.getFirstLinkpathDest(link.link, file.path);
					const resolved = dest instanceof TFile;
					const path = resolved ? dest.path : link.link;

					if (getPathItem(path)) continue;

					if (!resolved && !settings.showUnresolved) continue;

					setPathItem(path, {
						type: 'outgoing',
						path,
						displayName: resolved ? dest.basename : getLinkBasename(link.link),
						resolved,
						file: resolved ? dest : undefined,
						mtime: resolved ? dest.stat.mtime : 0,
						source,
						linkSubpath: extractSubpath(link.link),
						position:
							source === 'body'
								? (link as ReferenceCache).position
							: undefined,
					});
				}
			};

		addOutgoingLinks(cache.links ?? [], 'body');
		addOutgoingLinks(cache.frontmatterLinks ?? [], 'frontmatter');
	}

	const backlinks = (app.metadataCache as MetadataCacheInternal).getBacklinksForFile(file);
	if (backlinks?.data) {
		for (const [sourcePath, refs] of backlinks.data.entries()) {
			const sourceFile = app.vault.getAbstractFileByPath(sourcePath);
			if (!(sourceFile instanceof TFile)) continue;

			if (refs.length === 0) continue;

			const sortedRefs = [...refs].sort((a, b) => {
				const lineA = a.position?.start?.line ?? Number.MAX_SAFE_INTEGER;
				const lineB = b.position?.start?.line ?? Number.MAX_SAFE_INTEGER;
				if (lineA !== lineB) return lineA - lineB;
				const colA = a.position?.start?.col ?? 0;
				const colB = b.position?.start?.col ?? 0;
				return colA - colB;
			});

			const chosenRef =
				sortedRefs.find((ref) => ref.position?.start != null) ?? sortedRefs[0]!;
			const subpath = extractSubpath(chosenRef.link);
			const position = chosenRef.position;

			const existing = getPathItem(sourcePath);
			if (existing) {
				existing.type = 'bidirectional';
				existing.position = position;
				existing.linkSubpath = subpath;
			} else {
				setPathItem(sourcePath, {
					type: 'incoming',
					path: sourcePath,
					displayName: sourceFile.basename,
					resolved: true,
					file: sourceFile,
					mtime: sourceFile.stat.mtime,
					source: 'body',
					linkSubpath: subpath,
					position,
				});
			}
		}
	}

	return Array.from(itemsByPath.values());
}
