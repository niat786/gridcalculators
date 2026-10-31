<script lang="ts">
	import type { Table } from '../../calculators/types';
	import Icon from '../Icon.svelte';

	let { table }: { table: Table } = $props();
</script>

<details class="group rounded-card bg-surface" open={!table.collapsed}>
	<summary class="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 font-semibold sm:px-6 [&::-webkit-details-marker]:hidden">
		{table.title}
		<span class="text-label-2 transition-transform group-open:rotate-180"><Icon name="chevronDown" size={20} /></span>
	</summary>
	<div class="max-h-[28rem] overflow-auto border-t border-separator">
		<table class="tabular w-full text-subhead">
			<thead class="sticky top-0 bg-surface text-footnote text-label-2">
				<tr>
					{#each table.columns as c (c.key)}
						<th scope="col" class="px-5 py-2.5 font-medium sm:px-6 {c.align === 'end' ? 'text-right' : 'text-left'}">{c.label}</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each table.rows as row, i (i)}
					<tr class="border-t border-separator">
						{#each table.columns as c (c.key)}
							<td class="px-5 py-2.5 whitespace-nowrap sm:px-6 {c.align === 'end' ? 'text-right' : 'text-left'}">{row[c.key]}</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</details>
