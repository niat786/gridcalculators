<script lang="ts">
	import Prose from '#lib/components/Prose.svelte';
	import Seo from '#lib/components/Seo.svelte';
	import { SITE } from '#lib/site.ts';

	const mail = `mailto:${SITE.contactEmail}`;
</script>

<Seo
	title="Contact"
	description="Contact GridCalculators to report a mistake, request a new calculator, ask a question or make a privacy request."
	path="/contact"
/>

<Prose title="Contact us">
	<p>We read every message. The best way to reach us is by email:</p>
	<p class="text-title3 font-semibold"><a href={mail}>{SITE.contactEmail}</a></p>
	{#if SITE.postalAddress}<p>Post: {SITE.operator ? `${SITE.operator}, ` : ''}{SITE.postalAddress}</p>{/if}

	<h2>Report a mistake</h2>
	<p>
		Accuracy matters most to us. If a result looks wrong, please send the page address (copy it from your browser, it includes your
		inputs), what you expected, and the source you’re comparing with. We check every report and fix confirmed errors quickly.
	</p>

	<h2>Request a calculator</h2>
	<p>Tell us what you want to work out, which country it’s for, and if you know it, the official formula or rule we should follow.</p>

	<h2>Privacy requests</h2>
	<p>
		To ask about your data, or to use your rights under the GDPR, UK GDPR or US state privacy laws, email us with the subject
		“Privacy request”. Our <a href="/privacy">Privacy Policy</a> explains what data is involved.
	</p>

	<h2>Please note</h2>
	<p>
		We can’t give personal financial, tax, legal or medical advice. For decisions about your own situation, please speak to a
		qualified professional.
	</p>
</Prose>
