# Writing a calculator

Every calculator is **three files** in `src/lib/calculators/<category>/`, all named after the URL slug:

| File | Purpose |
| --- | --- |
| `<slug>.meta.ts` | Metadata for listings, search, sitemap (no math) |
| `<slug>.calc.ts` | Inputs, the pure `calculate()` function, and the page content |
| `<slug>.test.ts` | Known-answer tests for the math |

Categories (folder = category): `finance`, `health`, `math`, `everyday`, `developer` (encoders, networking, data and media tools).
The page, home page, category page, search, sitemap and structured data all pick a new calculator up
automatically. **Never edit shared files** (`types.ts`, `format.ts`, components, routes, other calculators).

## Read these first

- `src/lib/calculators/types.ts` — the full schema (input types, result shape, content shape).
- `src/lib/calculators/format.ts` — `money`, `num`, `pct`, `plural`, `DASH`. Always format with these.
- Reference calculators:
  - `health/bmi-calculator.*` — units switch with `visibleWhen`, gauge.
  - `finance/mortgage-calculator.*` — money, chart + table, amortization loop.
  - `health/calorie-calculator.*` — menu select, results table, safety floor.
  - `everyday/time-calculator.*` — modes, `duration`, `date`, `time` inputs.
  - `everyday/age-calculator.*` — UTC date math.

## Meta (`<slug>.meta.ts`)

```ts
import { defineMeta } from '../types';
export default defineMeta({
	slug: 'loan-calculator',            // = file name, lower-case-with-hyphens
	name: 'Loan Calculator',            // H1 and card title
	category: 'finance',                // = folder
	shortDescription: '…',              // ≤ 70 chars, one line, no full stop needed
	metaTitle: '…',                     // ≤ 60 chars. "Name — Benefit" pattern
	metaDescription: '…',               // 110–160 chars. Starts "Free …". Says what you get.
	icon: 'banknote',                   // MUST be a key of ICONS in src/lib/icons.ts
	keywords: ['…', '…', '…'],          // 3–8 lower-case search phrases
	updated: '2026-10-28',
	money: 'any'                        // see "Region and currency" below
	// no popularRank: the lead engineer sets it
});
```

## Region and currency (authenticity rules)

- **Universal maths that shows money** (loans, savings, prices, costs): set `money: 'any'`. The page then
  shows a currency picker and every `money()` / `$` prefix follows it. Write copy that works in any country.
- **Rules that belong to one country** (US tax brackets, IRS limits, FHA, Social Security, UK stamp duty…):
  set `region: 'US' | 'UK' | 'CA'`, `money: 'USD' | 'GBP' | 'CAD'` and a one-sentence `regionNote` saying
  what to use elsewhere. The page shows a “For the United States only” badge. Say the country in the intro.
- Never present a country-specific rule as universal. If a default value is country-specific (e.g. the IRS
  mileage rate) say so in the field's `help` and let people change it.
- Unit systems: offer metric and imperial wherever people use both.
- No money? Omit `money`.
- **Translation-ready:** every word a visitor sees comes from the calculator's config (labels, help, options,
  result labels, summary, content). Never hard-code visible text in components, and format numbers only with
  `format.ts` helpers, so the site can be translated later (see `docs/DATA_UPDATES.md` §11.1).
- **Figures that change over time** (tax brackets, limits, rates, official tables): put them in
  `src/lib/calculators/data/`, import them, and add them to `docs/DATA_UPDATES.md` with the source and
  when they change. Never hard-code them in a calculator.

## Inputs

- Give every number input a realistic `default`, `min`, `max`, and `prefix` (`$`) / `suffix` (`%`, `kg`, `years`).
- Use `display: 'segmented'` selects for 2–4 short choices (units, modes); `'menu'` for longer lists.
- Metric/imperial: one `units` select + `visibleWhen` per field (copy BMI). Feet + inches use `width: 'half'`.
- Repeating rows (`type: 'rows'`), number lists (`type: 'list'`), `duration`, `time`, `date` exist — see `types.ts`.
- Free text (`type: 'text'`): `multiline` for a textarea, `monospace` for code/binary/Base64, `pattern` +
  `patternMessage` to restrict characters, `maxLength` (default 5,000).
- Only use properties that exist in `types.ts` (e.g. `step` is allowed on number inputs but NOT on row columns).
- Labels are short nouns ("Interest rate"), `help` is one short line only when needed.

## `calculate(values)`

- **Pure**: no `Date.now()`, no randomness, no globals. Dates come in as inputs (`'today'` default is resolved for you).
- Numbers arrive parsed (`NaN` if invalid). Guard every input: return
  `{ primaryResult: DASH, primaryLabel: '…', summary: 'Say what to fix.' }` when the math can't run.
  Never return `NaN`, `Infinity` or `undefined` text. Bound every loop (e.g. `years <= 100`).
- Return formatted strings: `primaryResult` (the one answer), `primaryLabel`, `summary` (one sentence:
  the working or a plain-language reading), `secondaryMetrics` (2–7 rows), optional `table`, `chart`, `gauge`.
- Set `long: true` on the result when `primaryResult` is long text (encoded strings, binary, lists); it then
  renders in a smaller monospace style. Never for normal numbers or dates.
- Keep the number of `secondaryMetrics` stable across modes where possible (reserves layout space).
- Use standard, published formulas. Name the method in `content.formulas` (e.g. "Mifflin-St Jeor").

## Content (this is the SEO page — write it yourself)

- **Original writing only.** Never copy wording from calculator.net or any other site.
- Plain, friendly English. Short sentences. Second person ("Enter your…"). No hype, no filler.
- `intro`: 1–2 sentences saying what it calculates and why.
- `howTo`: 3–4 steps matching the actual inputs.
- `formulas`: the real formula(s) in plain text with Unicode (×, ÷, ², √, ⁿ). Explain each symbol in `variables`.
- `example`: a realistic worked example. **Compute every number with node before writing it**, and make the
  example's numbers match what your `calculate()` returns for those inputs (your test checks this).
- `faq`: 3–5 real questions people search, each answered in 1–3 sentences.
- `sources`: 1–2 authoritative links. Prefer a specific page you are confident exists; a well-known organisation's
  home page is the fallback. Never invent deep URLs. (government, medical body, standards body, textbook). Required for health
  and finance. Only real URLs you are sure exist.
- `disclaimer`: required for health and finance (one sentence: estimates, not professional advice).
- Health tools: neutral, non-judgmental wording about body size. No "ideal body" language beyond the formula names.

## Tests (`<slug>.test.ts`)

```ts
import { describe, expect, it } from 'vitest';
import calc from './loan-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('loan calculator', () => {
	it('matches the worked example', () => {
		expect(run({ amount: '20000', rate: '7', years: '5' }).primaryResult).toBe('$396.02');
	});
	// ≥ 3 known-answer cases (independently computed), plus edge cases (zero rate, invalid input → '—').
});
```

## Check before you finish

```sh
npx vitest run src/lib/calculators/<category>/<slug>    # your tests
npx vitest run src/lib/calculators/all-calculators      # contract tests for every calculator
npx svelte-check --tsconfig ./tsconfig.json             # 0 errors
```
All three must pass. Do not run `npm run build` (the lead engineer does).
