<script lang="ts">
	import Prose from '#lib/components/Prose.svelte';
	import Seo from '#lib/components/Seo.svelte';
	import { SITE } from '#lib/site.ts';

	const mail = `mailto:${SITE.contactEmail}`;
	const ext = { rel: 'noopener noreferrer', target: '_blank' } as const;
</script>

<Seo
	title="Privacy Policy"
	description="How GridCalculators handles your data: what we collect (very little), cookies and advertising, and your rights in the EU, UK and US."
	path="/privacy"
/>

<Prose title="Privacy Policy" updated="October 31, 2026">
	<p>
		This policy explains what information is collected when you use {SITE.domain}, why, and the choices and rights you have.
		We wrote it in plain English. In short: <strong>we don’t ask for your name or email, we don’t have user accounts, and the
		numbers you type into our calculators stay in your browser.</strong> Our main use of data is advertising, which keeps the site free.
	</p>

	<h2 id="who">1. Who we are</h2>
	<p>
		{SITE.name} ({SITE.domain}) is a free website of online calculators{SITE.operator ? `, operated by ${SITE.operator}` : ''}{SITE.postalAddress ? `, ${SITE.postalAddress}` : ''}.
		For data protection law in the EU and UK, we are the “controller” of the personal data described here.
		You can reach us about anything in this policy at <a href={mail}>{SITE.contactEmail}</a>.
	</p>

	<h2 id="calculations">2. The numbers you enter</h2>
	<p>
		All calculations run in your own browser. We don’t receive, store or see the values you type. To let you bookmark or share a
		result, your inputs can appear in the page address (for example <code>?amount=1000</code>). That address stays on your device
		unless you choose to share it.
	</p>

	<h2 id="collect">3. What is collected, and why</h2>
	<ul>
		<li>
			<strong>Technical data (all visitors).</strong> Like every website, our hosting and security provider, Cloudflare, receives your
			IP address, browser and device type, the page you asked for and the time. This is used to deliver the page, keep the site
			secure and stop abuse. Legal basis (EU/UK): our legitimate interest in running a secure, working website.
		</li>
		<li>
			<strong>Advertising data (where ads are shown).</strong> Google, our advertising partner, may use cookies and similar
			technologies to show ads, limit how often you see an ad, measure ads and prevent fraud. If you allow personalised ads,
			Google may also use your visits to this and other sites to choose ads for you. See <a href="#ads">section 5</a>.
			Legal basis (EU/UK): your consent where the law requires it, and otherwise our legitimate interest in funding the site with ads.
		</li>
		<li>
			<strong>Preferences saved on your device.</strong> If you choose a currency, we remember it in your browser’s local storage
			so you don’t have to pick it again. The currency converter keeps today’s rates in session storage for up to an hour so it
			doesn’t download them again on every page. This information never leaves your device and isn’t used to identify you.
		</li>
		<li>
			<strong>Emails you send us.</strong> If you email us, we receive your email address and whatever you write. We use it only to
			reply and to fix any mistake you report. Legal basis (EU/UK): our legitimate interest in answering you.
		</li>
	</ul>
	<p>We don’t collect sensitive data such as health records, and we don’t sell your data for money.</p>

	<h2 id="cookies">4. Cookies and similar technologies</h2>
	<p>We don’t set our own tracking or analytics cookies. Here is everything that may be stored on your device:</p>
	<ul>
		<li><strong>Your currency choice</strong> (local storage, key <code>gc-currency</code>): kept until you clear your browser data. Needed for a feature you asked for.</li>
		<li><strong>Cached exchange rates</strong> (session storage): deleted when you close the tab, and refreshed after an hour.</li>
		<li>
			<strong>Google advertising cookies</strong>: set by Google when ads are shown, and only with your consent where the law requires it
			(for example in the EU, the UK and Switzerland). You can see and change your choice at any time through the
			<strong>“Privacy and cookie settings”</strong> link that Google’s consent message adds to the page.
		</li>
	</ul>
	<p>You can also block or delete cookies and site data in your browser settings. The calculators keep working without them.</p>

	<h2 id="ads">5. Advertising by Google</h2>
	<p>
		We use Google AdSense to show ads. Third-party vendors, including Google, use cookies to serve ads based on your prior visits to
		this website or other websites. Google’s use of advertising cookies enables it and its partners to serve ads to you based on
		your visits to this site and/or other sites on the internet.
	</p>
	<ul>
		<li>You can opt out of personalised advertising at <a href="https://adssettings.google.com" {...ext}>Google’s Ad Settings</a>.</li>
		<li>You can opt out of some other vendors’ use of cookies for personalised ads at <a href="https://www.aboutads.info/choices/" {...ext}>aboutads.info</a> (US) or <a href="https://www.youronlinechoices.eu" {...ext}>youronlinechoices.eu</a> (Europe).</li>
		<li>Learn how Google uses information from sites that use its services at <a href="https://policies.google.com/technologies/partner-sites" {...ext}>policies.google.com/technologies/partner-sites</a>.</li>
		<li>
			<strong>In the EU, UK and Switzerland</strong>, ads are shown only after you make a choice in a consent message from a
			Google-certified consent platform. If you decline, Google may still show non-personalised ads, which use cookies only where your
			consent allows it.
		</li>
		<li>
			<strong>Global Privacy Control:</strong> if your browser sends a Global Privacy Control signal, we ask Google to show you only
			non-personalised ads.
		</li>
	</ul>

	<h2 id="third-parties">6. Who else receives data</h2>
	<ul>
		<li><strong>Cloudflare, Inc.</strong> hosts and protects the site (<a href="https://www.cloudflare.com/privacypolicy/" {...ext}>privacy policy</a>).</li>
		<li><strong>Google LLC / Google Ireland Ltd</strong> provides advertising (<a href="https://policies.google.com/privacy" {...ext}>privacy policy</a>).</li>
		<li>
			<strong>Exchange-rate providers.</strong> When you open the currency converter, your browser downloads rates from
			ExchangeRate-API (open.er-api.com), or from Frankfurter (api.frankfurter.dev) as a backup. Like any website, they receive your IP
			address and browser details. We send them nothing else.
		</li>
	</ul>
	<p>We may also share information if the law requires it, or to protect our rights and the safety of our visitors.</p>

	<h2 id="transfers">7. International transfers</h2>
	<p>
		Cloudflare and Google may process data in the United States and other countries. When data leaves the EU, UK or Switzerland,
		these providers rely on recognised safeguards, such as the EU–US Data Privacy Framework (and its UK and Swiss extensions) or the
		European Commission’s Standard Contractual Clauses.
	</p>

	<h2 id="retention">8. How long data is kept</h2>
	<ul>
		<li>Calculator inputs: never stored by us.</li>
		<li>Preferences in your browser: until you clear them.</li>
		<li>Hosting and security logs: kept by Cloudflare for a short period under its own policy.</li>
		<li>Advertising data: kept by Google under its own policy.</li>
		<li>Emails: as long as needed to deal with your message, then deleted, unless the law requires us to keep them longer.</li>
	</ul>

	<h2 id="rights-eu">9. Your rights in the EU, EEA, UK and Switzerland</h2>
	<p>Under the GDPR, the UK GDPR and Swiss law, you have the right to:</p>
	<ul>
		<li>ask for access to the personal data we hold about you, and a copy of it;</li>
		<li>ask us to correct or delete it, or to limit how we use it;</li>
		<li>object to our use of it based on legitimate interests, including for direct marketing;</li>
		<li>withdraw your consent at any time, without affecting earlier use (for ads, use the “Privacy and cookie settings” link);</li>
		<li>receive data you gave us in a portable format;</li>
		<li>complain to your local data protection authority, or in the UK to the Information Commissioner’s Office (ICO).</li>
	</ul>
	<p>
		Because we don’t run accounts or store your calculations, we usually hold no data that identifies you. For data held by Google or
		Cloudflare, you can also contact them directly. We reply to requests within one month.
	</p>

	<h2 id="rights-us">10. Your rights in the United States</h2>
	<p>
		Residents of California and several other US states (including Virginia, Colorado, Connecticut, Utah, Texas, Oregon and others with
		similar laws) have rights over their personal information. In the last 12 months, the categories of personal information
		collected through this site were: <strong>identifiers</strong> (IP address and online identifiers such as cookie IDs) and
		<strong>internet activity</strong> (pages viewed and interactions with ads). They were collected from your browser and used for the
		purposes in section 3.
	</p>
	<ul>
		<li><strong>Right to know and access</strong> the personal information collected about you.</li>
		<li><strong>Right to delete</strong> and <strong>right to correct</strong> it.</li>
		<li>
			<strong>Right to opt out of “sale” or “sharing” for targeted advertising.</strong> We don’t sell personal information for money.
			However, letting Google personalise ads can count as “sharing” or “targeted advertising” under some state laws. To opt out, use
			<a href="https://adssettings.google.com" {...ext}>Google’s Ad Settings</a>, turn on Global Privacy Control in your browser
			(we honour it, see section 5), or email us. Where Google shows a US state privacy message on this site, you can also opt out there.
		</li>
		<li><strong>Right to non-discrimination:</strong> you get the same site and the same calculators whatever you choose.</li>
	</ul>
	<p>
		To make a request, email <a href={mail}>{SITE.contactEmail}</a> with the subject “Privacy request”. You may use an authorised agent.
		We may need to ask a few questions to confirm the request is genuine. We don’t sell or share the personal information of anyone
		we know to be under 16.
	</p>

	<h2 id="children">11. Children</h2>
	<p>
		This site is for a general audience and isn’t directed at children under 13 (or under 16 in the EU and UK). We don’t knowingly
		collect personal information from children. If you believe a child has sent us personal information, please email us and we’ll
		delete it.
	</p>

	<h2 id="security">12. Security</h2>
	<p>
		The whole site is served over HTTPS with modern security headers. Because we don’t collect accounts, passwords or calculator
		inputs, there is very little personal data that could be exposed. No method of transmission over the internet is 100% secure,
		but we take reasonable steps to protect the site.
	</p>

	<h2 id="changes">13. Changes to this policy</h2>
	<p>
		We may update this policy, for example when we add a new feature or partner. The date at the top shows the latest version. If a
		change is significant, we’ll make it clear on this page.
	</p>

	<h2 id="contact">14. Contact</h2>
	<p>
		Questions, requests or complaints about privacy: <a href={mail}>{SITE.contactEmail}</a>.
		{#if SITE.postalAddress}Post: {SITE.operator ? `${SITE.operator}, ` : ''}{SITE.postalAddress}.{/if}
	</p>
</Prose>
