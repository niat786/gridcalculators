# GridCalculators.com

A multi-calculator platform with an Apple-inspired, mobile-first UI. Every page is prerendered to
static HTML (SvelteKit + adapter-static), styled with Tailwind CSS v4, and all math runs in the browser.

## Commands

```sh
npm install        # once
npm run dev        # http://localhost:5173 (ad slots show as labelled placeholders here)
npm run check      # type-check
npm test           # math + contract tests for every calculator
npm run build      # static site → ./build
npm run preview    # serve ./build locally
```

## Adding a calculator

Full guide: [`docs/CALCULATOR_GUIDE.md`](docs/CALCULATOR_GUIDE.md). Backlog with priorities, search volume and CPC:
[`docs/calculator-backlog.csv`](docs/calculator-backlog.csv).
Yearly figures (tax brackets, 401(k)/IRA limits, Social Security, CPI…) and when to update them:
[`docs/DATA_UPDATES.md`](docs/DATA_UPDATES.md).

Three files in `src/lib/calculators/<category>/`, all named after the URL slug (the third is `<slug>.test.ts`):

| File | Contains | Ships to the browser |
| --- | --- | --- |
| `<slug>.meta.ts` | name, category, SEO title/description, icon, keywords, popularity | No (server/build only) |
| `<slug>.calc.ts` | inputs, the pure `calculate()` function, formulas, worked example, FAQ, sources | Only on that calculator's page |

Copy an existing pair (e.g. `health/bmi-calculator.*`) and edit. Nothing else needs touching:
the page, home page, category page, search index, sitemap and JSON-LD pick it up automatically.
The build fails if the file name and slug disagree, or a slug is duplicated.

Rules of thumb:
- `calculate()` must be pure: inputs in, formatted strings out. Use helpers in `format.ts`.
- Return `'—'` (DASH) as `primaryResult` for impossible inputs, with a one-line `summary` saying why.
- Give every number input sensible `min`/`max` so validation messages are helpful.
- Health and money tools need `sources` and a `disclaimer`.

## Architecture

```
src/
  app.css                     design tokens (HIG colors, type scale, dark mode)
  params.ts                   route matchers (category vs calculator slugs)
  lib/
    calculators/              types, categories, catalog (meta glob), loaders (lazy calc glob)
    components/               Header, Footer, SearchBox, AdSlot, Seo, tiles…
    components/calculator/    CalculatorView (form + URL state), Field, ResultCard, LineChart, Gauge, DataTable
    ads/                      AdSense config + idle-time loader
    seo/jsonld.ts             XSS-safe JSON-LD helpers
  routes/
    [slug=calculator]/        every calculator page
    [slug=category]/          /finance-calculators etc.
    search, sitemap, about, privacy, terms, contact
    sitemap.xml, search-index.json   prerendered endpoints
static/_headers               security + cache headers (Cloudflare Pages / Netlify)
```

## Performance and Core Web Vitals

- Fully prerendered HTML; CSS is inlined (no render-blocking stylesheet); system fonts only (no web-font download).
- Static pages (about, privacy, terms, contact, all-calculators) ship **zero JavaScript**.
- Each calculator's math is its own small chunk, loaded only on its page.
- Zero layout shift: fixed-height ad boxes, reserved result rows, fixed chart height.
- Ads load only after the page is idle and only when a slot is near the viewport.

## Security

- Content-Security-Policy with sha256 hashes for SvelteKit's inline script (see `vite.config.ts`).
- `static/_headers`: HSTS, `frame-ancestors 'none'`, nosniff, referrer and permissions policies.
- No server, database or user accounts; inputs never leave the browser.
- JSON-LD is escaped so content can't break out of its `<script>` tag.

## Before launch

1. Set `contactEmail` in `src/lib/site.ts`.
2. Have the Privacy Policy and Terms reviewed for your jurisdiction.
3. After AdSense approval: fill `src/lib/ads/config.ts`, enable Google's consent message (Privacy & messaging) in AdSense, and add `static/ads.txt`.
4. Cloudflare Pages: build command `npm run build`, output directory `build`, Node 22. `static/_headers` and `404.html` are picked up automatically. Then submit `/sitemap.xml` in Google Search Console.
