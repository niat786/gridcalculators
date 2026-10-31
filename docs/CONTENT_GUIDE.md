# Writing the content under each calculator

The text under a calculator has two jobs: help a real person understand their result, and help search engines
understand the page. If those two ever conflict, the person wins.

Our readers are everywhere: India, Pakistan, the Gulf, Nigeria, the Philippines, the UK, the US. Many read
English as a second language, often on a phone. Write for them.

## 1. Voice: simple, human, honest

- **Plain English.** Use common words. Say "use", not "utilize"; "about", not "approximately"; "help", not "facilitate".
- **Short sentences.** Aim for 10–15 words. Never more than 30. One idea per sentence.
- **Short paragraphs.** 2–4 sentences. White space is kind on a phone.
- **Talk to the reader.** Use "you" and "your". Use active voice: "The bank charges interest", not "Interest is charged".
- **Sound like a helpful person.** Warm and direct, like a friend who is good with numbers. Use contractions
  (it's, you'll, don't). Vary sentence length a little so it doesn't sound robotic.
- **Use transition words** to connect ideas: *first, next, then, also, but, however, for example, because, so,
  as a result, in short, that said*. At least a quarter of sentences should have one.
- **Explain terms the first time.** "Your principal (the amount you borrow)…"
- **Use examples with real numbers.** People understand "₹10,000 a month for 10 years" faster than a definition.
- **No filler or hype.** Don't write "ultimate guide", "unlock", "seamless", "delve", "in today's fast-paced world",
  "look no further", "whether you're a…", "it's important to note", "in conclusion". No exclamation marks.
  The full list is `BANNED` in `src/lib/calculators/content-qa.ts`.
- **Few em dashes.** Prefer full stops and commas.
- **Neutral and respectful.** Body size, money trouble, debt, religion and health are personal. Never judge or shame.

## 2. Truth: every claim must be right

- **Only write what you can back up.** Rates, limits, laws, medical cut-offs and dates must come from an official
  or authoritative source (government, regulator, central bank, WHO/CDC/NHS, standards body). List it in `sources`.
- **Use the data files for numbers that change.** In country tools, build sentences from the constants in
  `src/lib/calculators/data/…` with template strings, so the text updates when the data does:
  `` `The standard deduction for ${TAX_YEAR} is ${money(STANDARD_DEDUCTION.single, true)}.` ``
- **Name the year and the place.** "In 2026/27, in England…", not "currently" or "in most countries".
- **No promises.** Don't say "accurate to the penny", "guaranteed", "the best calculator". Say what the tool assumes.
- **Health and money pages (YMYL):** say clearly that results are estimates, when to see a professional, and
  what the tool doesn't include. Never give medical diagnoses or personal financial advice.
- **The worked example must match the calculator.** Compute it with the real `calculate()` (the test checks it).
- **Don't copy.** Write everything yourself. Never copy wording from calculator.net or any other site.

## 3. Structure of every page

The page shows these parts in order (fields in the calculator's `content`):

1. `intro`: 1–2 sentences under the title. What the tool does and who it is for. Include the main keyword once, naturally.
2. `howTo`: 3–5 short steps that match the real inputs.
3. `about`: **3–5 sections.** Each has a `heading` (an H2) and 1–4 short `paragraphs`, plus an optional `list` or `table`.
   Good section types:
   - **What is …?** A plain definition.
   - **How … is calculated.** The method in words, linking to the formula below.
   - **How to read your result.** What the numbers mean, with ranges or categories (a table is great here).
   - **Things that change the result.** Factors, limits and assumptions.
   - **Tips.** 3–6 practical tips as a `list`.
   - Country tools: **Rules in [country] for [year]**, with a table of slabs or rates from the data file.
4. `formulas`: the real formula in plain text with every symbol explained.
5. `example`: a realistic worked example, step by step.
6. `faq`: **4–7 questions** people really search ("How is…", "What is a good…", "Is … the same as…").
   Answers: 1–3 sentences, under 90 words, direct answer first.
7. `sources`: 1–3 authoritative links.
8. `disclaimer`: required for health and finance.

Length: **700–1,500 words** of prose for most pages. Bigger topics (income tax, mortgage, BMI) can go to 2,000.
Don't pad. A shorter page that answers the question beats a long one that doesn't.

## 4. Headings and keywords

- Headings are plain questions or statements: "What is a good BMI?", "How EMI is calculated".
- Put the main keyword in the intro, one heading and the first FAQ, naturally. Use related terms elsewhere
  (e.g. "monthly payment", "loan term", "interest rate" on a loan page). Never repeat a keyword just to repeat it.
- `metaTitle` ≤ 60 characters, `metaDescription` 110–160 characters starting with "Free …" and saying what you get.

## 5. Internal links

- Link to **3–8 other calculators** from the text where it truly helps the reader:
  `[BMR calculator](/bmr-calculator)`. Use descriptive anchor text, never "click here".
- Link to the category page when it helps: `[finance calculators](/finance-calculators)`.
- Set `meta.related` to 3–6 hand-picked slugs. These show first under "Related calculators".
- Country tools link to tools for the **same country** first (e.g. India income tax → HRA, in-hand salary, PPF).
- Never link a page to itself. Only link slugs that exist (the tests check this).
- Markup allowed in text: `[anchor](/slug)` and `**bold**`. Nothing else, no HTML.

## 6. Schema (JSON-LD)

Added automatically on every calculator page from the content: Organization, WebSite, WebPage,
WebApplication (free, with category, country if any), BreadcrumbList, HowTo (from `howTo`) and FAQPage
(from `faq`). `src/lib/seo/jsonld.test.ts` validates it for every calculator. Writers only need good
`howTo` steps and FAQ answers. **Never add ratings or reviews** we don't actually collect.

## 7. Checks (must pass)

`npx vitest run src/lib/calculators/all-calculators --fsModuleCache=false` runs `content-qa.ts` on every page
that has `about`:

- 3+ about sections, 4–7 FAQs, 3+ how-to steps, 600–2,200 words of prose
- average sentence ≤ 17 words, no sentence over 32 words, paragraphs ≤ 5 sentences
- 25%+ of sentences with a transition word
- no banned phrases, no exclamation marks, few em dashes
- 3–12 internal links, none broken, none to itself; valid `related` slugs
- FAQ questions end with "?", answers ≤ 90 words

The checks catch style problems. They can't catch a wrong fact, so check every number against its source.
