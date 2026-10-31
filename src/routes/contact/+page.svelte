<script lang="ts">
	import Prose from '#lib/components/Prose.svelte';
	import Seo from '#lib/components/Seo.svelte';
	import { SITE } from '#lib/site.ts';
</script>

<Seo title="Contact" description="Contact GridCalculators to report a mistake, request a new calculator or ask a question." path="/contact" />

<Prose title="Contact us">
	<p>We read every message. Write to us to report a mistake, request a calculator or ask a question.</p>
	<p><strong>Email:</strong> {SITE.contactEmail}</p>
	<h2>Requesting a calculator</h2>
	<p>Tell us what you want to work out and, if you know it, the formula or source you’d expect us to use.</p>
</Prose>
