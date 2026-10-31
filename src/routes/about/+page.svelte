<script lang="ts">
	import Prose from '#lib/components/Prose.svelte';
	import Seo from '#lib/components/Seo.svelte';
</script>

<Seo
	title="About GridCalculators"
	description="Who we are, how we build our calculators, where our figures come from and how we check the math behind every result."
	path="/about"
/>

<Prose title="About GridCalculators">
	<p>
		GridCalculators is a library of free online calculators for money, tax, health, maths and everyday life, used by people around
		the world. Our goal is simple: give you a correct answer quickly, and show you exactly how we got it.
	</p>

	<h2>How we build calculators</h2>
	<ul>
		<li>Every calculator uses a published, standard formula, which we show on the page.</li>
		<li>Each one has a worked example you can check by hand, and automated tests that check the maths against known answers.</li>
		<li>Country tools (tax, salary, pensions, end-of-service pay) follow the official rules for the country and year shown on the page.</li>
		<li>We review the maths and the wording regularly and show the last review date on every page.</li>
	</ul>

	<h2>Where our figures come from</h2>
	<p>
		Tax rates, limits and other rules come from official sources such as tax authorities, government departments, central banks and
		recognised health bodies. Each page lists the sources it uses. When an official page isn’t available, we confirm the figure in at
		least two reputable sources. When a rule changes, we update the calculator and its explanation together.
	</p>

	<h2>Independent</h2>
	<p>
		We are not a government agency, bank or medical provider, and we aren’t paid to recommend any product. The site is free and
		funded by advertising. Ads are shown separately from our content and never change a calculator’s result.
	</p>

	<h2>Private by design</h2>
	<p>
		Calculations run entirely in your browser. The numbers you type are never sent to our servers. Read more in our
		<a href="/privacy">Privacy Policy</a>.
	</p>

	<h2>Found a mistake?</h2>
	<p>Accuracy matters to us. If a result looks wrong, please <a href="/contact">tell us</a> and we’ll fix it.</p>
</Prose>
