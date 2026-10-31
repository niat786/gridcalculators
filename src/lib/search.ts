/** Client-side search over a tiny prerendered index (/search-index.json), fetched on first use. */
export interface SearchEntry {
	/** name */ n: string;
	/** slug */ s: string;
	/** short description */ d: string;
	/** category name */ c: string;
	/** keywords, space separated, lower case */ k: string;
}

let indexPromise: Promise<SearchEntry[]> | null = null;

export function loadIndex(): Promise<SearchEntry[]> {
	indexPromise ??= fetch('/search-index.json')
		.then((r) => (r.ok ? r.json() : []))
		.catch(() => {
			indexPromise = null;
			return [];
		});
	return indexPromise;
}

const norm = (s: string) =>
	s
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.trim();

export function search(index: SearchEntry[], query: string, limit = 8): SearchEntry[] {
	const q = norm(query);
	if (!q) return [];
	const terms = q.split(/\s+/);
	const scored: { e: SearchEntry; score: number }[] = [];
	for (const e of index) {
		const name = norm(e.n);
		const hay = `${name} ${e.k} ${norm(e.d)} ${norm(e.c)}`;
		if (!terms.every((t) => hay.includes(t))) continue;
		let score = 0;
		if (name.startsWith(q)) score += 100;
		if (name.includes(q)) score += 50;
		for (const t of terms) {
			if (name.includes(t)) score += 10;
			if (e.k.includes(t)) score += 5;
		}
		scored.push({ e, score });
	}
	return scored
		.sort((a, b) => b.score - a.score || a.e.n.localeCompare(b.e.n))
		.slice(0, limit)
		.map((x) => x.e);
}
