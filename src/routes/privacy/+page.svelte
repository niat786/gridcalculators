<script lang="ts">
	import Prose from '#lib/components/Prose.svelte';
	import Seo from '#lib/components/Seo.svelte';
	import { SITE } from '#lib/site.ts';
</script>

<Seo title="Privacy Policy" description="How GridCalculators handles your data, cookies and advertising." path="/privacy" />

<!-- Template text: have it reviewed for your jurisdiction before launch. -->
<Prose title="Privacy Policy" updated="October 28, 2026">
	<h2>The numbers you enter</h2>
	<p>All calculations happen in your browser. We do not receive or store the values you type. Your inputs may appear in the page address so you can bookmark or share a result.</p>
	<h2>Advertising and cookies</h2>
	<p>We show ads from Google AdSense to keep the site free. Third-party vendors, including Google, use cookies to serve ads based on your prior visits to this and other websites. Google’s use of advertising cookies lets it and its partners serve ads to you based on those visits.</p>
	<ul>
		<li>You can opt out of personalised advertising at <a href="https://adssettings.google.com" rel="noopener noreferrer" target="_blank">Google Ads Settings</a>.</li>
		<li>Learn how Google uses data at <a href="https://policies.google.com/technologies/partner-sites" rel="noopener noreferrer" target="_blank">policies.google.com/technologies/partner-sites</a>.</li>
		<li>Visitors in the EEA, UK and Switzerland are asked for consent before personalised ads are shown.</li>
	</ul>
	<h2>Server logs</h2>
	<p>Our hosting provider may keep standard logs (such as IP address, browser type and pages requested) for security and reliability.</p>
	<h2>Contact</h2>
	<p>Questions about privacy: {SITE.contactEmail}</p>
</Prose>
