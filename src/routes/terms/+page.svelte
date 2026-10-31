<script lang="ts">
	import Prose from '#lib/components/Prose.svelte';
	import Seo from '#lib/components/Seo.svelte';
	import { SITE } from '#lib/site.ts';

	const mail = `mailto:${SITE.contactEmail}`;
</script>

<Seo
	title="Terms of Use"
	description="The terms for using GridCalculators: results are estimates, not professional advice. Includes our disclaimer, acceptable use and consumer rights."
	path="/terms"
/>

<Prose title="Terms of Use" updated="October 31, 2026">
	<p>
		These terms apply when you use {SITE.domain} (“the site”){SITE.operator ? `, operated by ${SITE.operator}` : ''}. By using the
		site, you agree to them. If you don’t agree, please don’t use the site. They are written to be clear, and nothing in them takes
		away rights you have under the consumer laws of your country.
	</p>

	<h2 id="service">1. What the site offers</h2>
	<p>
		{SITE.name} provides free online calculators and explanations for money, tax, health, maths and everyday life. You don’t need an
		account. The site is free to use and is funded by advertising.
	</p>

	<h2 id="disclaimer">2. Results are estimates, not advice</h2>
	<p>
		Our calculators are for <strong>general information and education only</strong>. Results are estimates based on the numbers you
		enter, the formulas we describe on each page and the rules we list as sources.
	</p>
	<ul>
		<li><strong>Not financial, tax or legal advice.</strong> Tax rules, rates and limits change, and your situation may include details a calculator can’t cover. Check important money, tax or legal decisions with a qualified adviser or the official authority.</li>
		<li><strong>Not medical advice.</strong> Health calculators (such as BMI, calorie, pregnancy or kidney function tools) can’t diagnose or treat anything. Talk to a doctor or other qualified health professional about your health.</li>
		<li><strong>Country-specific tools</strong> apply only to the country and year shown on the page.</li>
		<li><strong>Exchange rates</strong> in the currency converter are indicative mid-market rates. The rate you get from a bank or transfer service will differ.</li>
	</ul>
	<p>You’re responsible for how you use the results.</p>

	<h2 id="accuracy">3. Accuracy</h2>
	<p>
		We work hard to keep every calculator correct: we use published formulas and official sources, test the maths, and show the date
		each page was last reviewed. Even so, mistakes can happen and rules change. If you find an error, please email
		<a href={mail}>{SITE.contactEmail}</a> and we’ll look at it quickly.
	</p>

	<h2 id="use">4. Acceptable use</h2>
	<p>Please use the site fairly. You agree not to:</p>
	<ul>
		<li>try to disrupt, overload or break into the site or its servers;</li>
		<li>scrape or download the site in a way that affects other visitors, or copy it in whole or large part;</li>
		<li>use the site for anything unlawful, or to mislead others by presenting our results as official advice;</li>
		<li>interfere with the ads, for example with automated or fraudulent clicks.</li>
	</ul>
	<p>Linking to any page, and sharing results with the share or copy buttons, is welcome.</p>

	<h2 id="ip">5. Our content</h2>
	<p>
		The site’s design, text, code and graphics belong to {SITE.operator || SITE.name} and are protected by copyright. You may use the
		calculators and quote short parts of our explanations with a link back to the page. Mathematical formulas, laws and public data
		belong to no one, and we credit the official sources we use. Trademarks of others belong to their owners.
	</p>
	<p>
		If you believe something on the site infringes your copyright, email <a href={mail}>{SITE.contactEmail}</a> with the page address,
		the work you own, and your contact details, and we’ll review it promptly.
	</p>

	<h2 id="third-party">6. Ads and links to other sites</h2>
	<p>
		The site shows ads from Google and links to official and third-party websites. We don’t control those sites or products and
		aren’t responsible for their content, offers or privacy practices. An ad on our site is not our recommendation.
	</p>

	<h2 id="warranty">7. No warranty</h2>
	<p>
		To the extent the law allows, the site and its results are provided “as is” and “as available”, without warranties of any kind,
		whether express or implied, including fitness for a particular purpose, accuracy and uninterrupted availability.
	</p>

	<h2 id="liability">8. Limitation of liability</h2>
	<p>
		To the extent the law allows, we are not liable for any loss or damage arising from your use of the site or from decisions made
		using its results, including lost profits, tax penalties or indirect losses. Because the site is free, our total liability for any
		claim is limited to the amount you paid us to use it, which is zero.
	</p>
	<p>
		Nothing in these terms limits liability that can’t be limited by law, such as for death or personal injury caused by negligence,
		fraud, or (for consumers in the EU and UK) liability under mandatory consumer-protection rules.
	</p>

	<h2 id="consumers">9. If you live in the EU, EEA or UK</h2>
	<p>
		If you use the site as a consumer, you keep the protection of the mandatory laws of the country where you live, and you may bring
		a claim in the courts of that country. If you have a problem, please contact us first and we’ll try to resolve it directly.
	</p>

	<h2 id="changes">10. Changes</h2>
	<p>
		We may change the site, add or remove calculators, and update these terms. The date at the top shows the latest version. If you
		keep using the site after a change, the new terms apply from then on.
	</p>

	<h2 id="general">11. General</h2>
	<p>
		If any part of these terms can’t be enforced, the rest still applies. If we don’t enforce a term straight away, we can still do so
		later. Our <a href="/privacy">Privacy Policy</a> explains how data is handled.
	</p>

	<h2 id="contact">12. Contact</h2>
	<p>
		Questions about these terms: <a href={mail}>{SITE.contactEmail}</a>.
		{#if SITE.postalAddress}Post: {SITE.operator ? `${SITE.operator}, ` : ''}{SITE.postalAddress}.{/if}
	</p>
</Prose>
