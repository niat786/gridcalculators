<script lang="ts">
	let { size = 24 }: { size?: number } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" class="shrink-0 text-accent">
	<rect x="2" y="2" width="9" height="9" rx="2.5" fill="currentColor" />
	<rect x="13" y="2" width="9" height="9" rx="2.5" fill="currentColor" opacity="0.55" />
	<rect x="2" y="13" width="9" height="9" rx="2.5" fill="currentColor" opacity="0.55" />
	<rect x="13" y="13" width="9" height="9" rx="2.5" fill="currentColor" opacity="0.3" />
</svg>
