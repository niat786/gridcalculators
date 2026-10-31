<script lang="ts">
	import Prose from '#lib/components/Prose.svelte';
	import Seo from '#lib/components/Seo.svelte';
</script>

<Seo title="About GridCalculators" description="Who we are, how we build our calculators and how we check the math behind every result." path="/about" />

<Prose title="About GridCalculators">
	<p>GridCalculators is a growing library of free online calculators for money, health, math and everyday life. Our goal is simple: give you a correct answer quickly, and show you exactly how we got it.</p>
	<h2>How we build calculators</h2>
	<ul>
		<li>Every calculator uses a published, standard formula, which we show on the page.</li>
		<li>Each one includes a worked example you can check by hand.</li>
		<li>Health and finance tools link to the official sources we used.</li>
		<li>We review the math and the wording regularly and show the last review date on every page.</li>
	</ul>
	<h2>Private by design</h2>
	<p>Calculations run entirely in your browser. The numbers you type are never sent to our servers.</p>
	<h2>Found a mistake?</h2>
	<p>Accuracy matters to us. If a result looks wrong, please <a href="/contact">tell us</a> and we’ll fix it.</p>
</Prose>
