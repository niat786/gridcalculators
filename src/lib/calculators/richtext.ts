/**
 * Tiny, safe text markup for calculator content. Only two things are recognised:
 *   [anchor text](/internal-path)   → an internal link (must start with "/", no protocol, no "//")
 *   **bold**                        → <strong>
 * Everything else is plain text, rendered escaped by Svelte. External links belong in content.sources.
 */
export type Segment = { t: 'text'; v: string } | { t: 'link'; v: string; href: string } | { t: 'bold'; v: string };

const TOKEN = /\[([^\]]+)\]\((\/[a-z0-9\-/#]*)\)|\*\*([^*]+)\*\*/g;

export function parseRich(text: string): Segment[] {
	const out: Segment[] = [];
	let last = 0;
	for (const m of text.matchAll(TOKEN)) {
		if (m.index > last) out.push({ t: 'text', v: text.slice(last, m.index) });
		if (m[1] !== undefined) out.push({ t: 'link', v: m[1], href: m[2] });
		else out.push({ t: 'bold', v: m[3] });
		last = m.index + m[0].length;
	}
	if (last < text.length) out.push({ t: 'text', v: text.slice(last) });
	return out;
}

/** Plain text (for JSON-LD, meta and readability checks). */
export function plainText(text: string): string {
	return parseRich(text)
		.map((s) => s.v)
		.join('');
}

/** Internal link targets in a piece of text, e.g. ['/bmi-calculator']. */
export function linkTargets(text: string): string[] {
	return parseRich(text).flatMap((s) => (s.t === 'link' ? [s.href] : []));
}
