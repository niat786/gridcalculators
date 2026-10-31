<script lang="ts">
	import type { RowsInput } from '../../calculators/types';
	import Icon from '../Icon.svelte';
	import { decodeRows } from './state';

	interface Props {
		input: RowsInput;
		value: string;
		error: string;
		onchange: (value: string) => void;
		id: string;
	}
	let { input, value, error, onchange, id }: Props = $props();

	const rows = $derived(decodeRows(input, value));
	const max = $derived(input.maxRows ?? 30);
	const min = $derived(input.minRows ?? 1);

	function encode(next: Record<string, string>[]) {
		onchange(next.map((r) => input.columns.map((c) => encodeURIComponent(r[c.id] ?? '')).join('|')).join(';'));
	}
	function setCell(ri: number, col: string, v: string) {
		const next = rows.map((r) => ({ ...r }));
		next[ri][col] = v;
		encode(next);
	}
	function addRow() {
		const blank: Record<string, string> = {};
		for (const c of input.columns) blank[c.id] = c.type === 'text' ? '' : String(c.default);
		encode([...rows, blank]);
	}
	function removeRow(ri: number) {
		encode(rows.filter((_, i) => i !== ri));
	}
	const cell =
		'h-11 w-full min-w-0 rounded-[10px] border border-border bg-canvas px-3 text-body text-label outline-none focus:border-accent';
</script>

<fieldset class="min-w-0" aria-describedby={error ? `${id}-error` : undefined}>
	<legend class="mb-2 text-subhead font-medium text-label">{input.label}</legend>
	<ol class="space-y-3">
		{#each rows as row, ri (ri)}
			<li class="rounded-xl bg-canvas/60 p-0 sm:p-0">
				<div class="flex items-end gap-2">
					<div class="grid min-w-0 flex-1 gap-2" style="grid-template-columns: repeat({input.columns.length}, minmax(0, 1fr))">
						{#each input.columns as c (c.id)}
							<label class="min-w-0">
								<span class="mb-1 block truncate text-caption text-label-2 {ri > 0 ? 'sm:sr-only' : ''}">{c.label}</span>
								{#if c.type === 'select'}
									<select class={cell} value={row[c.id]} onchange={(e) => setCell(ri, c.id, e.currentTarget.value)}>
										{#each c.options as o (o.value)}<option value={o.value}>{o.label}</option>{/each}
									</select>
								{:else if c.type === 'number'}
									<input class="{cell} tabular" type="text" inputmode="decimal" autocomplete="off" value={row[c.id]} oninput={(e) => setCell(ri, c.id, e.currentTarget.value)} />
								{:else}
									<input class={cell} type="text" autocomplete="off" placeholder={c.placeholder ?? ''} value={row[c.id]} oninput={(e) => setCell(ri, c.id, e.currentTarget.value)} />
								{/if}
							</label>
						{/each}
					</div>
					<button
						type="button"
						onclick={() => removeRow(ri)}
						disabled={rows.length <= min}
						aria-label="Remove row {ri + 1}"
						class="flex size-11 shrink-0 items-center justify-center rounded-full text-label-2 hover:bg-fill disabled:opacity-30"
					>
						<Icon name="close" size={18} strokeWidth={2} />
					</button>
				</div>
			</li>
		{/each}
	</ol>
	{#if rows.length < max}
		<button type="button" onclick={addRow} class="mt-3 flex min-h-11 items-center gap-1.5 rounded-full px-1 text-subhead font-semibold text-accent-text">
			<span class="text-title3 leading-none">+</span>{input.addLabel ?? 'Add row'}
		</button>
	{/if}
	{#if error}
		<p id="{id}-error" class="mt-1.5 text-footnote text-danger">{error}</p>
	{:else if input.help}
		<p class="mt-1.5 text-footnote text-label-2">{input.help}</p>
	{/if}
</fieldset>
