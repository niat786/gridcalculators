<script lang="ts">
	import type { CalculatorInput } from '../../calculators/types';
	import { parseNumber } from '../../calculators/format';
	import DurationField from './DurationField.svelte';
	import RowsField from './RowsField.svelte';

	interface Props {
		input: CalculatorInput;
		value: string | boolean;
		error: string;
		onchange: (value: string | boolean) => void;
		/** Unique per page so ids never collide. */
		idPrefix: string;
		/** Replaces a "$" prefix so money fields show the chosen currency. */
		currencySymbol?: string;
	}
	let { input, value, error, onchange, idPrefix, currencySymbol = '$' }: Props = $props();
	const prefix = $derived(input.type === 'number' && input.prefix === '$' ? currencySymbol : input.type === 'number' ? input.prefix : undefined);

	const id = $derived(`${idPrefix}-${input.id}`);
	const helpId = $derived(`${id}-help`);
	const errId = $derived(`${id}-error`);
	const describedBy = $derived(
		[input.help && !error ? helpId : '', error ? errId : ''].filter(Boolean).join(' ') || undefined
	);
	/** Add thousands separators when the person leaves the field (typing stays untouched). */
	function tidy(raw: string) {
		const n = parseNumber(raw);
		if (Number.isNaN(n) || Math.abs(n) < 1000) return;
		const pretty = n.toLocaleString('en-US', { maximumFractionDigits: 10 });
		if (pretty !== raw) onchange(pretty);
	}

	const fieldShell =
		'flex h-12 items-center rounded-control border bg-canvas transition-colors focus-within:border-accent';
</script>

{#if input.type === 'select' && input.display === 'segmented'}
	<fieldset class="min-w-0">
		<legend class="mb-2 text-subhead font-medium text-label">{input.label}</legend>
		<div class="flex rounded-[10px] bg-fill p-[3px]">
			{#each input.options as opt (opt.value)}
				<label
					class="relative flex min-h-10 flex-1 cursor-pointer items-center justify-center rounded-lg px-2 text-center text-footnote leading-tight font-medium text-label transition-colors has-checked:bg-surface has-checked:font-semibold has-checked:shadow-[0_1px_3px_rgb(0_0_0/0.12)] has-focus-visible:outline-2 has-focus-visible:outline-accent sm:text-subhead"
				>
					<input
						type="radio"
						class="sr-only"
						name={id}
						value={opt.value}
						checked={value === opt.value}
						onchange={() => onchange(opt.value)}
					/>
					{opt.label}
				</label>
			{/each}
		</div>
	</fieldset>
{:else if input.type === 'duration'}
	<DurationField {input} value={String(value)} {error} {onchange} {id} />
{:else if input.type === 'rows'}
	<RowsField {input} value={String(value)} {error} {onchange} {id} />
{:else}
	<div class="min-w-0">
		<label for={id} class="mb-2 block text-subhead font-medium text-label">{input.label}</label>

		{#if input.type === 'number'}
			<div class="{fieldShell} {error ? 'border-danger' : 'border-border'}">
				{#if prefix}<span class="pl-3.5 whitespace-nowrap text-label-2" aria-hidden="true">{prefix}</span>{/if}
				<input
					{id}
					type="text"
					inputmode={input.decimal === false ? 'numeric' : 'decimal'}
					autocomplete="off"
					enterkeyhint="done"
					value={String(value)}
					oninput={(e) => onchange(e.currentTarget.value)}
					onblur={(e) => tidy(e.currentTarget.value)}
					aria-invalid={error ? 'true' : undefined}
					aria-describedby={describedBy}
					class="tabular h-full w-full min-w-0 bg-transparent text-body text-label outline-none {prefix
						? 'pl-1.5'
						: 'pl-3.5'} {input.suffix ? 'pr-1.5' : 'pr-3.5'}"
				/>
				{#if input.suffix}<span class="pr-3.5 whitespace-nowrap text-label-2" aria-hidden="true">{input.suffix}</span>{/if}
			</div>
		{:else if input.type === 'slider'}
			<div class="flex items-center gap-4">
				<input
					{id}
					type="range"
					min={input.min}
					max={input.max}
					step={input.step}
					value={String(value)}
					oninput={(e) => onchange(e.currentTarget.value)}
					aria-describedby={describedBy}
					class="h-11 flex-1 accent-accent"
				/>
				<output for={id} class="tabular w-20 text-right font-semibold">{value}{input.suffix ?? ''}</output>
			</div>
		{:else if input.type === 'select'}
			<div class="{fieldShell} border-border">
				<select
					{id}
					value={String(value)}
					onchange={(e) => onchange(e.currentTarget.value)}
					aria-describedby={describedBy}
					class="h-full w-full bg-transparent px-3.5 text-body text-label outline-none"
				>
					{#each input.options as opt (opt.value)}
						<option value={opt.value}>{opt.label}</option>
					{/each}
				</select>
			</div>
		{:else if input.type === 'date'}
			<div class="{fieldShell} {error ? 'border-danger' : 'border-border'}">
				<input
					{id}
					type="date"
					value={String(value)}
					oninput={(e) => onchange(e.currentTarget.value)}
					aria-invalid={error ? 'true' : undefined}
					aria-describedby={describedBy}
					class="tabular h-full w-full bg-transparent px-3.5 text-body text-label outline-none"
				/>
			</div>
		{:else if input.type === 'text'}
			{#if input.multiline}
				<textarea
					{id}
					rows="4"
					spellcheck="false"
					autocomplete="off"
					autocapitalize="off"
					placeholder={input.placeholder ?? ''}
					value={String(value)}
					oninput={(e) => onchange(e.currentTarget.value)}
					aria-invalid={error ? 'true' : undefined}
					aria-describedby={describedBy}
					class="block min-h-28 w-full resize-y rounded-control border bg-canvas px-3.5 py-3 text-body text-label outline-none focus:border-accent {input.monospace
						? 'font-mono text-callout'
						: ''} {error ? 'border-danger' : 'border-border'}"
				></textarea>
			{:else}
				<div class="{fieldShell} {error ? 'border-danger' : 'border-border'}">
					<input
						{id}
						type="text"
						spellcheck="false"
						autocomplete="off"
						autocapitalize="off"
						placeholder={input.placeholder ?? ''}
						value={String(value)}
						oninput={(e) => onchange(e.currentTarget.value)}
						aria-invalid={error ? 'true' : undefined}
						aria-describedby={describedBy}
						class="h-full w-full min-w-0 bg-transparent px-3.5 text-body text-label outline-none {input.monospace ? 'font-mono' : ''}"
					/>
				</div>
			{/if}
		{:else if input.type === 'time'}
			<div class="{fieldShell} {error ? 'border-danger' : 'border-border'}">
				<input
					{id}
					type="time"
					value={String(value)}
					oninput={(e) => onchange(e.currentTarget.value)}
					aria-invalid={error ? 'true' : undefined}
					aria-describedby={describedBy}
					class="tabular h-full w-full bg-transparent px-3.5 text-body text-label outline-none"
				/>
			</div>
		{:else if input.type === 'list'}
			<textarea
				{id}
				rows="3"
				inputmode="decimal"
				spellcheck="false"
				autocomplete="off"
				placeholder={input.placeholder ?? 'e.g. 4, 8, 15, 16, 23, 42'}
				value={String(value)}
				oninput={(e) => onchange(e.currentTarget.value)}
				aria-invalid={error ? 'true' : undefined}
				aria-describedby={describedBy}
				class="tabular block min-h-24 w-full resize-y rounded-control border bg-canvas px-3.5 py-3 text-body text-label outline-none focus:border-accent {error
					? 'border-danger'
					: 'border-border'}"
			></textarea>
		{:else if input.type === 'toggle'}
			<input
				{id}
				type="checkbox"
				role="switch"
				checked={Boolean(value)}
				onchange={(e) => onchange(e.currentTarget.checked)}
				aria-describedby={describedBy}
				class="h-7 w-12 accent-accent"
			/>
		{/if}

		{#if error}
			<p id={errId} class="mt-1.5 text-footnote text-danger">{error}</p>
		{:else if input.help}
			<p id={helpId} class="mt-1.5 text-footnote text-label-2">{input.help}</p>
		{/if}
	</div>
{/if}
