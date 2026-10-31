/**
 * Contract tests that run against EVERY calculator automatically.
 * Per-calculator math checks live next to each calculator as <slug>.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { defaultRaw, isVisible, toValues, validate } from '../components/calculator/state';
import type { CalculatorConfig, CalculatorMeta } from './types';
import { CATEGORY_BY_ID } from './categories';
import { ICONS } from '../icons';
import { CATEGORIES } from './categories';
import { reviewContent } from './content-qa';

const configs = import.meta.glob<CalculatorConfig>('./*/*.calc.ts', { eager: true, import: 'default' });
const metas = import.meta.glob<CalculatorMeta>('./*/*.meta.ts', { eager: true, import: 'default' });

const KNOWN = new Set([...Object.values(metas).map((m) => m.slug), ...CATEGORIES.map((c) => c.slug)]);

describe.each(Object.entries(configs))('%s', (path, config) => {
	const meta = config.meta;

	// Pages with written SEO content (content.about) must pass the writing checks in docs/CONTENT_GUIDE.md.
	it.runIf(Boolean(config.content.about))('passes the content quality checks', () => {
		const r = reviewContent(config, KNOWN);
		expect(r.issues, r.issues.join('\n')).toEqual([]);
	});

	it('has a matching meta file and slug', () => {
		const slug = path.split('/').pop()!.replace('.calc.ts', '');
		expect(meta.slug).toBe(slug);
		expect(metas[path.replace('.calc.ts', '.meta.ts')]).toBeDefined();
		expect(path.split('/')[1]).toBe(meta.category);
		expect(CATEGORY_BY_ID[meta.category]).toBeDefined();
		expect(ICONS[meta.icon]).toBeDefined();
	});

	it('lists each source only once', () => {
		const urls = (config.content.sources ?? []).map((s) => s.url);
		expect(new Set(urls).size, urls.join(' | ')).toBe(urls.length);
	});

	it('has SEO metadata within limits', () => {
		expect(meta.metaTitle.length).toBeLessThanOrEqual(60);
		expect(meta.metaDescription.length).toBeGreaterThanOrEqual(110);
		expect(meta.metaDescription.length).toBeLessThanOrEqual(160);
		expect(meta.keywords.length).toBeGreaterThanOrEqual(3);
		expect(meta.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});

	it('has complete page content', () => {
		const c = config.content;
		expect(c.intro.length).toBeGreaterThan(40);
		expect(c.howTo.length).toBeGreaterThanOrEqual(2);
		expect(c.formulas.length).toBeGreaterThanOrEqual(1);
		expect(c.example.steps.length).toBeGreaterThanOrEqual(2);
		expect(c.faq.length).toBeGreaterThanOrEqual(3);
		if (meta.category === 'health' || meta.category === 'finance') {
			expect(c.disclaimer ?? '', 'health/finance tools need a disclaimer').not.toBe('');
		}
	});

	if (config.widget) return;

	it('has unique input ids and valid defaults', () => {
		const ids = config.inputs.map((i) => i.id);
		expect(new Set(ids).size).toBe(ids.length);
		const raw = defaultRaw(config.inputs, '2026-01-15');
		const values = toValues(config.inputs, raw);
		for (const input of config.inputs) {
			if (!isVisible(input, values)) continue;
			expect(validate(input, raw[input.id]), `default of "${input.id}"`).toBe('');
		}
	});

	it('produces a real result from its defaults, in every select mode', () => {
		const raw = defaultRaw(config.inputs, '2026-01-15');
		const variants = [raw];
		// Also try each option of segmented selects (units, modes) with other defaults.
		for (const input of config.inputs) {
			if (input.type === 'select') {
				for (const o of input.options) variants.push({ ...raw, [input.id]: o.value });
			}
		}
		for (const r of variants) {
			const result = config.calculate(toValues(config.inputs, r));
			expect(result.primaryLabel, JSON.stringify(r)).toBeTruthy();
			expect(result.primaryResult, JSON.stringify(r)).not.toBe('—');
			expect(result.primaryResult).not.toMatch(/NaN|undefined|Infinity/);
			for (const m of result.secondaryMetrics ?? []) expect(m.value, m.label).not.toMatch(/NaN|undefined/);
			const labels = (result.secondaryMetrics ?? []).map((m) => m.label);
			expect(new Set(labels).size, `duplicate metric labels: ${labels.join(' | ')}`).toBe(labels.length);
		}
	});

	it('does not throw on empty or junk input', () => {
		const raw = defaultRaw(config.inputs, '2026-01-15');
		for (const input of config.inputs) {
			if (input.type === 'toggle') continue;
			for (const junk of ['', 'abc', '-1', '0', '1e309']) {
				expect(() => config.calculate(toValues(config.inputs, { ...raw, [input.id]: junk }))).not.toThrow();
			}
		}
	});
});
