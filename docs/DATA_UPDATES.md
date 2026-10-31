# Data updates: time-sensitive figures

Some calculators use official figures that change on a schedule: tax brackets, contribution limits,
Social Security amounts, inflation data and similar. This file lists every one of them: where it lives,
its current value, when it changes and where to get the new number.

**Rule:** each figure lives in **one place**, usually a file in `src/lib/calculators/data/`. Calculators import it
from there, so updating the data file updates every page and FAQ that uses it. Never type these
numbers directly into a calculator.

Last full review: **2026-10-28** (US tax year 2026; other countries' current tax years — see §10).

---

## Yearly calendar

| When | What changes | Section |
| --- | --- | --- |
| **Every month (~10th–15th)** | US CPI (inflation calculator) | [CPI](#1-us-consumer-price-index-cpi) |
| **Mid-October** | Social Security COLA, wage base, bend points | [Social Security](#4-social-security) |
| **Late Oct – early Nov** | IRS tax brackets, standard deduction, credits, estate exemption | [Federal income tax](#2-us-federal-income-tax) and [Estate tax](#5-estate-and-gift-tax) |
| **Early November** | 401(k), IRA limits, Roth phase-outs | [Retirement limits](#3-retirement-plan-limits) |
| **Mid/late December** | IRS standard mileage rate | [Mileage](#6-irs-standard-mileage-rate) |
| **Whenever announced** | FHA mortgage insurance premium, VA funding fee, Army standard | [Loans](#7-fha-and-va-loans) and [Army](#8-army-body-composition-standard) |
| **When a roadmap item ships** | Add its data files here and to the calendar | [§11](#11-planned-additions-roadmap) |
| **Rarely (check yearly)** | RMD table and start ages, CKD-EPI eGFR equation, WHS golf rules | [Stable rules](#9-stable-rules-check-once-a-year) |
| **January** | Canada (brackets, CPP/EI, TFSA, RRSP), Singapore CPF ceilings, Kenya/Nigeria/Philippines/Malaysia payroll rates | [§10](#10-country-rules-waves-47) |
| **February** | India Union Budget (from 1 April), South Africa Budget (from 1 March), Pakistan Zakat nisab (Ramadan) | [§10](#10-country-rules-waves-47) |
| **March–April** | UK tax year (6 April), New Zealand (1 April), India small-savings rate each quarter (also Jul/Oct/Jan) | [§10](#10-country-rules-waves-47) |
| **June–July** | Pakistan & Bangladesh budgets (from 1 July), Australia (1 July), Saudi GOSI new-entrant rate step (July) | [§10](#10-country-rules-waves-47) |
| **Whenever announced** | Gulf labour-law amendments, GCC VAT changes, UAE corporate tax reliefs, EPF ceiling, GST slabs | [§10](#10-country-rules-waves-47) |

---

## 1. US Consumer Price Index (CPI)

- **File:** `src/lib/calculators/data/cpi.ts`
- **Used by:** inflation-calculator
- **Current:**
  - `CPI_ANNUAL`: annual averages for 1913–2025 (2025 is an 11-month average because the BLS published no October 2025 figure)
  - `CPI_LATEST = { month: '2026-08', index: 334.98 }`
  - `CPI_LAST_YEAR = 2025`
- **Changes:** each month, when the BLS releases CPI-U for the previous month (around the 10th–15th).
- **Source:** BLS CPI-U, All items, U.S. city average, not seasonally adjusted (series CUUR0000SA0).
  <https://www.bls.gov/cpi/>
- **Monthly update:** set `CPI_LATEST` to the newest month and index.
- **Each January**, after December's CPI is out:
  - add the full-year average to `CPI_ANNUAL`
  - raise `CPI_LAST_YEAR`
- **Tests:** `finance/inflation-calculator.test.ts`. The worked example ($1,000 in 2000 → today) changes with `CPI_LATEST`, so update the example text in the calculator and the test together.

## 2. US federal income tax

- **File:** `src/lib/calculators/data/us-tax-2026.ts`. When the year changes, rename it to `us-tax-2027.ts` and update the imports.
- **Used by:** income-tax-calculator, take-home-pay-calculator, marriage-tax-calculator. The Social Security calculator also uses `SS_WAGE_BASE`.
- **Changes:** the IRS publishes next year's figures in late October or early November (a Revenue Procedure plus a newsroom post titled "IRS releases tax inflation adjustments for tax year 20XX").

| Constant | 2026 value | Notes |
| --- | --- | --- |
| `TAX_YEAR` | 2026 | Shown in labels and FAQs |
| `THRESHOLDS.single` | 0 / 12,400 / 50,400 / 105,700 / 201,775 / 256,225 / 640,600 | Lower edge of 10%–37% |
| `THRESHOLDS.mfj` | 0 / 24,800 / 100,800 / 211,400 / 403,550 / 512,450 / 768,700 | |
| `THRESHOLDS.mfs` | 0 / 12,400 / 50,400 / 105,700 / 201,775 / 256,225 / 384,350 | |
| `THRESHOLDS.hoh` | 0 / 17,700 / 67,450 / 105,700 / 201,750 / 256,200 / 640,600 | |
| `STANDARD_DEDUCTION` | single 16,100 · mfj 32,200 · mfs 16,100 · hoh 24,150 | |
| `EXTRA_65` | single/hoh 2,050 · married 1,650 (per person) | Age 65+ or blind |
| `SENIOR_DEDUCTION` | 6,000 per person 65+ | OBBBA. **Ends after tax year 2028**: remove it for 2029 |
| `SENIOR_THRESHOLD` | 75,000 single/hoh · 150,000 mfj | Phases out at 6% |
| `CTC_PER_CHILD` / `CTC_REFUNDABLE` | 2,200 / 1,700 | Indexed for inflation from 2026 on, so check each year |
| `CTC_PHASEOUT` | 200,000 · 400,000 mfj | Not indexed |
| `SS_WAGE_BASE` | 184,500 | **From SSA, mid-October** (see §4) |
| `SS_RATE`, `MEDICARE_RATE`, `ADDL_MEDICARE_*` | 6.2%, 1.45%, 0.9% over 200k/250k/125k | Set by law; rarely change |

- **Sources:**
  - IRS newsroom (search "tax inflation adjustments for tax year"): <https://www.irs.gov/newsroom>
  - 2026 release: <https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill>
  - The IRS post often lists brackets only for single and married filing jointly. Take head of household and married filing separately from the Revenue Procedure itself, or cross-check a reputable summary (e.g. NerdWallet's yearly bracket page).
- **Tests:**
  - `finance/income-tax-calculator.test.ts`: worked example $85,000 single → $9,870.00
  - `finance/take-home-pay-calculator.test.ts`: $75,000 every two weeks → $2,256.44
  - `finance/marriage-tax-calculator.test.ts`: $100k + $20k → bonus $3,520
  - Each calculator's `content.example` text must match its test, so recompute both.

## 3. Retirement plan limits

- **File:** `src/lib/calculators/data/us-retirement.ts`
- **Used by:** 401k-calculator, ira-calculator, roth-ira-calculator, take-home-pay-calculator (401(k) cap)
- **Changes:** the IRS announces next year's limits in early November (a newsroom post like "401(k) limit increases to $X for 20XX").

| Constant | 2026 value |
| --- | --- |
| `RETIREMENT_TAX_YEAR` | 2026 |
| `LIMIT_401K.elective` | 24,500 |
| `LIMIT_401K.catchUp50` | 8,000 |
| `LIMIT_401K.catchUp60to63` | 11,250 (SECURE 2.0, ages 60–63) |
| `LIMIT_IRA.base` / `catchUp50` | 7,500 / 1,100 (catch-up now indexed) |
| `ROTH_PHASEOUT.single` | 153,000 – 168,000 |
| `ROTH_PHASEOUT.mfj` | 242,000 – 252,000 |
| `ROTH_PHASEOUT.mfs` | 0 – 10,000 (not indexed) |
| `IRS_LIMITS_SOURCE` | Update the title and URL to the new IRS post |

- **Tests:**
  - `finance/401k-calculator.test.ts`: limits by age
  - `finance/ira-calculator.test.ts`
  - `finance/roth-ira-calculator.test.ts`
- **Note:** `roth-ira-calculator.calc.ts` has a worked example with the result "$3,750 for 2026". Recompute it and update its test.

## 4. Social Security

- **Files:**
  - `src/lib/calculators/finance/social-security-calculator.calc.ts`: `BEND_1`, `BEND_2`
  - `src/lib/calculators/data/us-tax-2026.ts`: `SS_WAGE_BASE`, shared with take-home pay
- **Changes:** SSA announces these with the COLA in mid-October, then publishes them in the Federal Register in early November.

| Constant | 2026 value |
| --- | --- |
| `BEND_1` | 1,286 |
| `BEND_2` | 7,749 |
| `SS_WAGE_BASE` | 184,500 |
| COLA (for reference only, not used) | 2.8% |

- **Sources:**
  - Bend points: <https://www.ssa.gov/oact/cola/bendpoints.html>
  - Wage base: <https://www.ssa.gov/oact/cola/cbb.html>
  - Fact sheet: <https://www.ssa.gov/news/press/factsheets/colafacts.pdf>
- **Tests:** `finance/social-security-calculator.test.ts`. The worked example ($60,000 for 35 years → $2,345 at 67, $1,642 at 62, $2,908 at 70) and the `pia(10000)` case both change with the bend points.
- **Stable:** the full retirement age table and the early/late claiming percentages are set by law.

## 5. Estate and gift tax

- **File:** `src/lib/calculators/finance/estate-tax-calculator.calc.ts`

| Constant | 2026 value | Notes |
| --- | --- | --- |
| `EXEMPTION_2026` | 15,000,000 | OBBBA made it permanent; **indexed from 2027**. Rename the constant per year |
| `ANNUAL_GIFT_EXCLUSION_2026` | 19,000 | Moves in $1,000 steps |
| `SCHEDULE` (§2001(c) rates, 18%–40%) | unchanged since 2013 | Changes only if the law changes |

- **Source:** the same IRS inflation-adjustments release as §2, under "Estate tax basic exclusion amount" and "annual exclusion for gifts".
- **Tests:** `finance/estate-tax-calculator.test.ts`. `tentativeTax(15_000_000)` = 5,945,800 must change to the new exemption's tentative tax; the worked example ($20M estate → $1.8M) also changes.

## 6. IRS standard mileage rate

- **File:** `src/lib/calculators/everyday/mileage-calculator.calc.ts`: the `default: 0.725` input value, plus the `help`, `howTo`, example and FAQ text that say "2026" and "72.5¢"
- **Current:** 72.5¢ per business mile (2026)
- **Changes:** the IRS announces next year's rate in mid/late December (a notice titled "IRS issues standard mileage rates for 20XX").
- **Source:** <https://www.irs.gov/tax-professionals/standard-mileage-rates>
- **Tests:** `everyday/mileage-calculator.test.ts`: 1,250 miles × rate.
- **To do:** move this rate into `data/` the next time it's touched.

## 7. FHA and VA loans

- **File:** `src/lib/calculators/data/us-loans.ts`
- **FHA:**
  - `FHA_UFMIP` 1.75%
  - annual premium rates in `fhaAnnualMip()` (HUD Mortgagee Letter 2023-05)
  - `FHA_MIP_THRESHOLD` 726,200, the loan-size break for the premium
- **VA:** `vaFundingFee()` covers purchase loans: 2.15% / 3.3% (first / subsequent use) with under 5% down, 1.5% with 5–9.99% down, 1.25% with 10%+ down. These rates have applied since April 2023.
- **Changes:** irregular, whenever HUD or VA announces a change. Check once a year in January.
- **Sources:**
  - HUD Mortgagee Letters: <https://www.hud.gov/program_offices/administration/hudclips/letters/mortgagee>
  - VA funding fee: <https://www.va.gov/housing-assistance/home-loans/funding-fee-and-closing-costs/>
- **Tests:** `finance/fha-loan-calculator.test.ts`, `finance/va-mortgage-calculator.test.ts`

## 8. Army body composition standard

- **File:** `src/lib/calculators/health/army-body-fat-calculator.calc.ts`: `WHTR_LIMIT = 0.55`
- **Current:** Army Directive 2026-13 (July 2026). The waist-to-height ratio must be **below 0.55**; it replaced the body fat tape test.
- **Changes:** irregular. The Army changed this standard in 2023, 2025 and 2026. Check every 6 months.
- **Source:** <https://www.army.mil/article/293753/army_modifies_body_composition_program_adopts_waist_to_height_ratio>
- **If it changes:** update the limit, the intro, the FAQs and the directive number in the meta `regionNote` and the disclaimer.

## 9. Stable rules (check once a year)

These rarely change, but confirm once a year (e.g. every January) that they are still current.

| Rule | File | Current basis |
| --- | --- | --- |
| RMD Uniform Lifetime Table | `finance/rmd-calculator.calc.ts` (`ULT`) | IRS Pub. 590-B Table III (in force since 2022) |
| RMD start ages | `finance/rmd-calculator.calc.ts` (`startAge`) | SECURE 2.0: 73 (born 1951–59), 75 (born 1960+) |
| eGFR equation | `health/gfr-calculator.calc.ts` | CKD-EPI 2021 race-free (NKF/ASN) |
| Golf handicap | `everyday/golf-handicap-calculator.calc.ts` | World Handicap System (USGA/R&A rules, 2024 edition) |
| Heat index, wind chill | `everyday/heat-index-calculator.calc.ts`, `everyday/wind-chill-calculator.calc.ts` | NWS formulas |
| Voltage drop resistances | `everyday/voltage-drop-calculator.calc.ts` | NEC Chapter 9, Table 8 |
| Atomic weights | `everyday/molecular-weight-calculator.calc.ts` | IUPAC CIAAW abridged table |
| BAC drink sizes and limits | `health/bac-calculator.calc.ts` | NIAAA, NHS; check country driving limits |
| Exchange rates | `components/widgets/CurrencyConverter.svelte` | Live (open.er-api.com, ECB fallback). Check that both feeds still respond |


## 10. Country rules (Waves 4–7)

Every country tool keeps its rules in a data file with a source comment above each figure. When a country's
tax year rolls over, update its data file, rerun `npx vitest run`, and fix the tests that change (they are
known-answer tests, so a changed figure *should* break them). Rename year-specific files and constants
(e.g. `in-tax-fy2026-27.ts` → `in-tax-fy2027-28.ts`) and update the year labels.

| Country | Data file(s) | Calculators | Current year | Update when | Where to check |
| --- | --- | --- | --- | --- | --- |
| India | `in-tax-fy2026-27.ts`, `in-tax-engine.ts`, `in-cg-fy2026-27.ts` | india-income-tax, in-hand-salary, hra, gratuity, capital-gains-tax-india, advance-tax | FY 2026-27 | **1 Feb Budget** (effective 1 Apr); CII each July | incometaxindia.gov.in, indiabudget.gov.in |
| India | `in-epf.ts` | epf, in-hand-salary | EPF rate FY 2025-26 (8.25%), wage ceiling ₹25,000 from 17 Sep 2026 | EPF rate declared ~Feb–Jun; ceiling when notified | epfindia.gov.in |
| India | `in-small-savings.ts`, `in-savings-2026.ts` | ppf, sukanya-samriddhi, nsc, kvp, scss, post-office-mis, nps | Oct–Dec 2026 rates | **Every quarter** (end of Mar/Jun/Sep/Dec) | nsiindia.gov.in, finance ministry OM |
| India | `in-gst.ts`, `in-deposits.ts` | gst, fd, rd | GST 2.0 slabs (22 Sep 2025) | When the GST Council changes slabs | cbic-gst.gov.in |
| UK | `uk-tax-2026-27.ts`, `uk-tax-engine.ts` | uk-take-home-pay, stamp-duty, uk-student-loan, redundancy-pay, statutory-maternity-pay, statutory-sick-pay, ir35 | 2026/27 | **Budget (autumn) + 6 April**; student loan interest each Sept; redundancy cap each April | gov.uk, revenue.scot, gov.wales |
| Canada | `ca-tax-2026.ts` | canada-income-tax, canada-take-home-pay, rrsp, tfsa, land-transfer-tax, canada-mortgage-stress-test, canada-sales-tax, cpp | 2026 (Quebec not included yet) | **January** indexation; provincial budgets (spring) | canada.ca (CRA), province sites |
| Australia | `au-tax-2026-27.ts`, `au-stamp-duty.ts` | australia-pay, australia-stamp-duty, superannuation, hecs-help, borrowing-power | 2026-27 (ACT stamp duty not included) | **1 July**; HELP indexation 1 June; state budgets | ato.gov.au, state revenue offices |
| New Zealand | `nz-tax-2026-27.ts` | nz-paye, kiwisaver | 2026-27 | **1 April**; ACC levy yearly | ird.govt.nz |
| Pakistan | `pk-tax-2027.ts` | pakistan-salary-tax, pakistan-property-tax | Tax year 2027 | **June budget** (effective 1 July) | fbr.gov.pk |
| Bangladesh | `bd-2026-27.ts` | bangladesh-income-tax | Income year 2026-27 | **June budget** | nbr.gov.bd |
| UAE | `ae-gratuity.ts`, `ae-corporate-tax.ts` | uae-gratuity, uae-corporate-tax | Decree-Law 33/2021; SBR to 2029 | When laws/decisions change | mohre.gov.ae, tax.gov.ae |
| Saudi Arabia | `sa-end-of-service.ts`, `sa-gosi.ts` | saudi-end-of-service, gosi | Labor Law as amended Feb 2025; GOSI 2024 law | **Each July** (new-entrant rate step to 11% by 2028) | hrsd.gov.sa, gosi.gov.sa |
| Qatar / Kuwait / Oman / Bahrain | `qa-end-of-service.ts`, `kw-indemnity.ts`, `om-end-of-service.ts`, `bh-leaving-indemnity.ts` | qatar-end-of-service, kuwait-indemnity, oman-end-of-service, bahrain-leaving-indemnity | Current labour laws | Oman: when the expat savings scheme starts (by July 2027) | ministry sites |
| GCC | `gcc-vat.ts` | gcc-vat | UAE 5, KSA 15, BH 10, OM 5, QA/KW none | If Qatar/Kuwait introduce VAT | tax authorities |
| South Africa | `za-2026-27.ts` | south-africa-income-tax, south-africa-take-home-pay, transfer-duty | 2026/27 (to 28 Feb 2027) | **February Budget** (effective 1 March) | sars.gov.za |
| Nigeria | `ng-2026.ts` | nigeria-paye | Nigeria Tax Act 2025 (from 1 Jan 2026) | When amended | nrs.gov.ng |
| Kenya | `ke-2026.ts` | kenya-paye | NSSF Year 4 (Feb 2026) | **Finance Act (July)**; NSSF each February | kra.go.ke |
| Philippines | `ph-2026.ts` | philippines-salary, thirteenth-month-pay | 2026 | **January** (SSS/PhilHealth schedules) | bir.gov.ph, sss.gov.ph |
| Malaysia | `my-2026.ts` | malaysia-income-tax, malaysia-epf | YA 2026 | **October Budget** (next YA); EPF dividend each Feb/Mar | hasil.gov.my, kwsp.gov.my |
| Singapore | `sg-2026.ts` | singapore-income-tax, cpf-contribution | YA 2026; CPF 2026 | **February Budget**; CPF rates each 1 January | iras.gov.sg, cpf.gov.sg |
| Universal (Islamic) | `zakat.ts`, `faraid.ts`, `faraid-engine.ts`, `islamic-home-finance.ts` | zakat, islamic-inheritance, islamic-home-finance | Stable rules | Rarely | — |

**Known gaps (deliberately not built, to avoid wrong answers):** Quebec income tax and take-home pay; ACT stamp
duty; Pakistan non-filer property rates and government pension; Islamic inheritance with grandmothers,
grandchildren, half-siblings or uncles (shows “consult a scholar”); NSW/QLD/TAS first-home concessions in
certain price bands.


## 11. Planned additions (roadmap)

What we intend to add later. Each item lists the **data it will bring with it**, so it gets an entry in §10
(and the yearly calendar) the day it ships. Order is a suggestion; keyword data (searches, CPC) decides.

### 11.1 Multi-language site (Europe and beyond)

**Status:** planned after the English site is launched, indexed and AdSense-approved (give Google a few months).

| Language | Markets | First country tools to add | Their tax year / update month |
| --- | --- | --- | --- |
| Spanish (`/es/`) | Spain, Mexico, Latin America, US Hispanic | Spain: IRPF + nómina (gross→net), plusvalía; Mexico: ISR, aguinaldo, finiquito, IMSS | Spain: calendar year, budget changes Jan; Mexico: Jan (UMA each Feb) |
| German (`/de/`) | Germany, Austria, Switzerland | Brutto-Netto-Rechner, Kfz-Steuer, Grunderwerbsteuer (by Land), Elterngeld, Rente; Austria Lohnsteuer | Germany: 1 Jan (Grundfreibetrag, BBG); Austria: 1 Jan |
| French (`/fr/`) | France, Belgium, Switzerland, Québec, Francophone Africa | Salaire brut→net, impôt sur le revenu, frais de notaire, ARE (chômage); Québec tax (also fills the current Quebec gap) | France: 1 Jan + Loi de finances (Dec); Québec: 1 Jan |
| Portuguese (`/pt/`) | Brazil, Portugal | Salário líquido, INSS, IRPF, FGTS, 13º salário, férias, rescisão; Portugal IRS | Brazil: Jan (INSS table, minimum wage), IRPF table when changed; Portugal: 1 Jan |
| Arabic (`/ar/`, right-to-left) | Gulf, Egypt, wider Arab world | Arabic versions of the Gulf gratuity, GOSI, VAT, Zakat, Faraid tools; Egypt income tax & salary | Egypt: 1 Jul (fiscal year) |
| Others later (by data) | Italy, Netherlands, Nordics, Poland, Turkey, Indonesia | IRPEF/busta paga, netto salaris, etc. | Mostly 1 Jan |

**Technical plan (one-time "language setup" wave):**
- Language folders on the same domain (`/de/…`, `/es/…`), translated slugs, `hreflang` + `x-default` on every page,
  per-language sitemaps, a language switcher, and RTL layout for Arabic.
- Locale-aware number/date/currency formatting (e.g. `1.234,56 €` in German). Today `format.ts` uses `en-US`
  (plus `en-IN` grouping for INR); this becomes a per-page locale.
- Universal calculators reuse the same maths; only text is translated. Country-only tools appear only in
  their own language (e.g. US tax tools are not translated).
- **Rule from now on:** keep all visible text in the calculator's config/content (never hard-coded in
  components), so it can be extracted for translation without rewriting pages.
- Translation: draft with the cheaper model, then **native-speaker review** of the top pages before publishing;
  thin or obviously machine-translated pages hurt rankings and trust.
- New data files per country (e.g. `de-tax-2027.ts`, `fr-tax-2027.ts`) follow the same rules as §10:
  one place per figure, source comment, known-answer tests, entry in this file.

### 11.2 Gaps in current tools (fill when rules can be verified)

| Gap | Why it's missing | What it needs |
| --- | --- | --- |
| Quebec income tax & take-home pay | How QPP/QPIP/EI enter Quebec tax not confirmed officially | Revenu Québec TP-1015.F-V formulas |
| ACT stamp duty (Australia) | 2026-27 rate table not on an official page we could reach | ACT Revenue Office table |
| Pakistan non-filer property rates, government pension | Sources conflict / official site blocked | FBR First Schedule; finance.gov.pk pension rules |
| India TDS calculator | Not started | Section-wise TDS rates under the Income-tax Act 2025 |
| Islamic inheritance: grandmothers, grandchildren, half-siblings, uncles | Blocking rules need a scholarly source | A recognised Faraid text; scholar review |
| NSW / QLD / TAS first-home concessions in some price bands | Formulas not verified | State revenue office calculators |
| Australian Medicare levy low-income thresholds 2026-27 | Not yet published by ATO when built | ATO (usually after the May Budget) |
| Bangladesh investment rebate / salary exemption | Only one published source each | NBR Finance Act 2026 text |
| Nigeria minimum tax for individuals | Sources disagree | Nigeria Tax Act 2025 text |

### 11.2b Page text to re-verify (typed in the text, not from a data file)

| Page | Claim | Check against |
| --- | --- | --- |
| australia-pay | Lowest rate due to fall to 14% from 1 July 2027 | ato.gov.au / Treasury |
| hecs-help | Indexation = lower of CPI and WPI; 3.2% on 1 June 2025 | ato.gov.au HELP indexation |
| singapore-income-tax | No personal income tax rebate for YA 2026 | iras.gov.sg Budget page |
| password-generator | NIST SP 800-63B-4 link | csrc.nist.gov |
| pakistan-zakat (FAQ, if any) | Bank nisab for 1448 AH (announced ~Feb 2027) | Ministry notice |

### 11.3 New features that bring live or changing data

| Feature | Data it needs | Update cadence |
| --- | --- | --- |
| Remittance cost calculator (AED/SAR → INR/PKR etc.) | Live FX (reuse the converter feed) + provider fee tables | Fees change often: re-check quarterly, show the date |
| Salary comparison between countries | World Bank PPP conversion factors / cost-of-living index | Yearly (World Bank updates mid-year) |
| Live gold & silver prices for Zakat nisab | A free, reliable price API (client-side, with date shown) | Live; fallback to user entry |
| Pakistan Zakat nisab (bank deduction threshold) | Ministry notice before Ramadan | Yearly (Feb) |
| Fuel / electricity price defaults by country | Official energy regulator prices | Monthly (e.g. Pakistan OGRA, India oil companies) |
| More GCC tools (UAE/Saudi visa & labour fees, WPS) | Ministry fee schedules | When announced |
| VAT/GST by country (≈40 countries) | Standard rates table (OECD / PwC summaries) | Check every January |

### 11.4 Launch and operations to-dos (not data, but don't forget)

- Replace `[YOUR CONTACT EMAIL]` in `src/lib/site.ts`.
- AdSense: add the publisher ID and ad unit IDs in `src/lib/ads/config.ts`, add `static/ads.txt`, turn on Google's consent (CMP) message.
- Deploy to Cloudflare Pages; verify Google Search Console and submit `/sitemap.xml`; add Cloudflare Web Analytics.
- Rewrite the SEO content under every tool (owner-guided), country tools first.
- Recheck UK rates after the 28 Oct 2026 Budget is legislated (effective April 2027).
- Optional: a scheduled monthly reminder that lists the items due in the calendar above.

---

## How to do an update

1. Get the new figure from the **official source** listed above, not from a blog. Keep the link.
2. Change the constant in the data file. Update the source title and URL if the source moved.
3. Recompute every worked example that uses it (run it in node) and update the example text **and** its test.
4. **Recheck the page text.** Country pages build most numbers from the data files, but some pages show example
   tables worked out from the calculator at its default inputs (e.g. the 401(k) contribution table, Roth and IRA
   tables, retirement/pension/annuity tables, the mortgage rate table). After changing a figure, run the calculator
   for those examples again and update the table text.
5. Search for leftover year text: `grep -rn "2026" src/lib/calculators --include=*.calc.ts`. Labels such as "2026 limit" usually come from the year constant, but FAQs and examples can hard-code it.
6. Set `updated: 'YYYY-MM-DD'` in the meta file of each calculator you touched (it feeds the page's "Updated" date and the sitemap).
7. Run the checks:
   ```sh
   npx vitest run
   npx svelte-check --tsconfig ./tsconfig.json
   npm run build
   ```
8. Add a line to the log below.

## Update log

| Date | What | By |
| --- | --- | --- |
| 2026-10-28 | Added §11 roadmap: multi-language (Europe, Arabic), known gaps, live-data features, launch to-dos | Claude |
| 2026-10-28 | Waves 4–7: 70 country tools for IN, UK, CA, AU, NZ, PK, BD, GCC, ZA, NG, KE, PH, MY, SG — see §10 | Claude |
| 2026-10-28 | Initial figures for tax year 2026: brackets, deductions, OBBBA senior deduction and CTC, 401(k)/IRA limits, SSA 2026, estate $15M, CPI to Aug 2026, Army WHtR 0.55 | Claude |
