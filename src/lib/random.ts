/**
 * Unbiased cryptographic randomness (crypto.getRandomValues + rejection sampling).
 * Math.random() is never used: it is predictable and unsuitable for passwords.
 */
export function randomInt(maxExclusive: number): number {
	if (!(maxExclusive > 0) || maxExclusive > 2 ** 32) throw new RangeError('range');
	const limit = Math.floor(2 ** 32 / maxExclusive) * maxExclusive;
	const buf = new Uint32Array(1);
	for (;;) {
		crypto.getRandomValues(buf);
		if (buf[0] < limit) return buf[0] % maxExclusive;
	}
}

/** Integer in [min, max], inclusive. Works for spans up to 2^32. */
export function randomBetween(min: number, max: number): number {
	return min + randomInt(max - min + 1);
}

/** Fisher–Yates shuffle with crypto randomness (returns a new array). */
export function shuffle<T>(items: T[]): T[] {
	const a = [...items];
	for (let i = a.length - 1; i > 0; i--) {
		const j = randomInt(i + 1);
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}
