import { App, Editor, MarkdownView, TFile } from 'obsidian';
import { LinkItem } from './links-collector';

export async function openLinkItem(
	app: App,
	item: LinkItem,
	sourcePath?: string,
): Promise<void> {
	await app.workspace.openLinkText(item.path, sourcePath ?? '');

	const view = app.workspace.getActiveViewOfType(MarkdownView);
	if (!view) return;

	if (item.linkSubpath) {
		const target = app.vault.getAbstractFileByPath(item.path);
		if (target instanceof TFile) {
			const line = findSubpathLine(app, target, item.linkSubpath);
			if (line != null) {
				scrollEditorToLine(view.editor, line);
				return;
			}
		}
	}

	// position is the location in the target note where the current note is referenced;
	// it is set for incoming and bidirectional items by collectLinks.
	if (item.position) {
		view.editor.setCursor({
			line: item.position.start.line,
			ch: item.position.start.col,
		});
		view.editor.scrollIntoView(
			{
				from: { line: item.position.start.line, ch: item.position.start.col },
				to: { line: item.position.end.line, ch: item.position.end.col },
			},
			true,
		);
	}
}

function findSubpathLine(app: App, file: TFile, subpath: string): number | null {
	const cache = app.metadataCache.getFileCache(file);
	if (!cache) return null;

	if (cache.headings) {
		for (const heading of cache.headings) {
			if (heading.heading === subpath) {
				return heading.position.start.line;
			}
		}
	}

	if (cache.blocks) {
		const block = cache.blocks[subpath];
		if (block) {
			return block.position.start.line;
		}
	}

	return null;
}

function scrollEditorToLine(editor: Editor, line: number): void {
	editor.setCursor({ line, ch: 0 });
	editor.scrollIntoView({ from: { line, ch: 0 }, to: { line, ch: 0 } }, true);
}
