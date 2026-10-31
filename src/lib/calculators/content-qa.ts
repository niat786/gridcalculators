/**
 * Automatic writing-quality checks for calculator pages (see docs/CONTENT_GUIDE.md).
 * They catch the measurable things: plain English, sentence length, transitions, internal links,
 * AI-sounding filler, structure. Truth is checked by sources and tests, not here.
 */
import { linkTargets, plainText } from './richtext';
import type { CalculatorConfig } from './types';

/** Words and phrases that read as filler or "AI voice". Keep the list short and obvious. */
export const BANNED = [
	'delve',
	'unlock',
	'unleash',
	'seamless',
	'leverage',
	'robust',
	'cutting-edge',
	'game-changer',
	'game changer',
	'embark',
	'realm',
	'tapestry',
	'elevate',
	'empower',
	'utilize',
	'utilise',
	'in today’s',
	"in today's",
	'fast-paced',
	'navigate the',
	'look no further',
	'whether you’re',
	"whether you're",
	'it’s important to note',
	"it's important to note",
	'in conclusion',
	'ultimate guide',
	'revolutionize',
	'effortless',
	'hassle-free',
	'one-stop',
	'world-class',
	'best-in-class'
];

/** Common transition words and phrases (lower case). */
export const TRANSITIONS = [
	'also',
	'and so',
	'as a result',
	'after that',
	'because',
	'but',
	'by contrast',
	'even so',
	'first',
	'for example',
	'for instance',
	'however',
	'in addition',
	'in fact',
	'in short',
	'in other words',
	'instead',
	'later',
	'likewise',
	'meanwhile',
	'next',
	'on the other hand',
	'otherwise',
	'second',
	'similarly',
	'since',
	'so',
	'still',
	'then',
	'therefore',
	'third',
	'this means',
	'though',
	'thus',
	'to start',
	'when',
	'while',
	'yet',
	'finally',
	'besides',
	'that said',
	'as well',
	'if',
	'unless',
	'once',
	'until',
	'because of this',
	'in that case',
	'by the way',
	'above all',
	'on average',
	'in most cases',
	'for this reason',
	'at the same time'
];

export interface QaReport {
	words: number;
	sentences: number;
	avgSentence: number;
	longest: { words: number; text: string };
	transitionShare: number;
	links: string[];
	issues: string[];
}

function words(s: string): string[] {
	return s.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w));
}

/** Split prose into sentences. Decimal points, "e.g." and "i.e." don't end a sentence. */
export function sentences(text: string): string[] {
	return text
		.replace(/\b(e\.g|i\.e|etc|vs|approx|no|St|Dr|Mr|Mrs|Ms)\./gi, '$1∯')
		.split(/(?<=[.!?])\s+(?=[A-Z0-9“"(₹$£€])/)
		.map((s) => s.replace(/∯/g, '.').trim())
		.filter((s) => words(s).length > 0);
}

/** All prose a reader sees under the calculator, as plain text blocks. */
export function proseBlocks(c: CalculatorConfig): string[] {
	const ct = c.content;
	return [
		ct.intro,
		...ct.howTo,
		...(ct.about ?? []).flatMap((s) => [...s.paragraphs, ...(s.list ?? [])]),
		...ct.faq.flatMap((f) => [f.a]),
		ct.example.result
	].map(plainText);
}

export function reviewContent(c: CalculatorConfig, knownSlugs: Set<string>): QaReport {
	const ct = c.content;
	const issues: string[] = [];
	const blocks = proseBlocks(c);
	const all = blocks.join(' ');
	const sents = blocks.flatMap(sentences);
	const lens = sents.map((s) => words(s).length);
	const total = words(all).length;
	const longestIdx = lens.indexOf(Math.max(...lens));
	const avg = lens.reduce((a, b) => a + b, 0) / Math.max(1, lens.length);

	// Structure
	const about = ct.about ?? [];
	if (about.length < 3) issues.push(`needs at least 3 "about" sections (has ${about.length})`);
	if (ct.faq.length < 4 || ct.faq.length > 7) issues.push(`FAQ should have 4–7 questions (has ${ct.faq.length})`);
	if (ct.howTo.length < 3) issues.push('howTo needs at least 3 steps');
	if (total < 600) issues.push(`too short: ${total} words of prose (min 600)`);
	if (total > 2200) issues.push(`too long: ${total} words of prose (max 2,200)`);
	for (const s of about) {
		if (!s.heading.trim()) issues.push('empty section heading');
		if (s.paragraphs.length === 0) issues.push(`section "${s.heading}" has no paragraphs`);
		for (const p of s.paragraphs) {
			const n = sentences(plainText(p)).length;
			if (n > 5) issues.push(`paragraph too long (${n} sentences) in "${s.heading}"`);
		}
		if (s.table) {
			for (const r of s.table.rows)
				if (r.length !== s.table.columns.length) issues.push(`table row length mismatch in "${s.heading}"`);
		}
	}
	for (const f of ct.faq) {
		if (!f.q.trim().endsWith('?')) issues.push(`FAQ question should end with "?": ${f.q}`);
		if (words(plainText(f.a)).length > 90) issues.push(`FAQ answer too long: ${f.q}`);
	}

	// Plain English
	if (avg > 17) issues.push(`average sentence too long: ${avg.toFixed(1)} words (max 17)`);
	if (lens[longestIdx] > 32) issues.push(`sentence too long (${lens[longestIdx]} words): "${sents[longestIdx]}"`);
	const lower = all.toLowerCase();
	for (const b of BANNED) if (lower.includes(b)) issues.push(`avoid the phrase "${b}"`);
	if ((all.match(/—/g) ?? []).length > total / 120) issues.push('too many em dashes; use full stops or commas');
	if (/[a-z]{2,}!(\s|$)/i.test(all)) issues.push('no exclamation marks');

	// Transitions: share of sentences that contain one
	const withT = sents.filter((s) => {
		const l = ` ${s.toLowerCase().replace(/[,.;:]/g, ' ')} `;
		return TRANSITIONS.some((t) => l.includes(` ${t} `));
	}).length;
	const share = withT / Math.max(1, sents.length);
	if (share < 0.25) issues.push(`use more transition words: ${(share * 100).toFixed(0)}% of sentences (min 25%)`);

	// Internal links
	const raw = [ct.intro, ...ct.howTo, ...about.flatMap((s) => [...s.paragraphs, ...(s.list ?? []), ...(s.table?.rows.flat() ?? [])]), ...ct.faq.map((f) => f.a)];
	const links = [...new Set(raw.flatMap(linkTargets))];
	const slugs = links.map((l) => l.replace(/^\//, '').replace(/#.*$/, ''));
	if (links.length < 3) issues.push(`add internal links: ${links.length} (min 3)`);
	if (links.length > 12) issues.push(`too many internal links: ${links.length} (max 12)`);
	for (const s of slugs) {
		if (s === c.meta.slug) issues.push('links to itself');
		else if (s && !knownSlugs.has(s)) issues.push(`broken internal link: /${s}`);
	}
	for (const r of c.meta.related ?? []) if (!knownSlugs.has(r)) issues.push(`unknown related slug: ${r}`);

	return {
		words: total,
		sentences: sents.length,
		avgSentence: avg,
		longest: { words: lens[longestIdx] ?? 0, text: sents[longestIdx] ?? '' },
		transitionShare: share,
		links,
		issues
	};
}
