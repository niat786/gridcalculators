<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { evaluate, ExprError, formatResult, type AngleMode } from '../../keypad/expr';
	import CopyButton from '../CopyButton.svelte';
	import Icon from '../Icon.svelte';

	interface Props {
		/** Starting mode. */
		mode?: 'basic' | 'scientific';
		/** Show the Basic / Scientific switch. */
		allowModeSwitch?: boolean;
		/** Listen to the physical keyboard while nothing else has focus. */
		keyboard?: boolean;
		/** Heading level text for screen readers. */
		label?: string;
	}
	let { mode: initialMode = 'basic', allowModeSwitch = true, keyboard = true, label = 'Calculator' }: Props =
		$props();

	let mode = $state<'basic' | 'scientific'>(untrack(() => initialMode));
	let angle = $state<AngleMode>('deg');
	let expr = $state('');
	let fresh = $state(false); // true right after "=": a digit starts a new expression
	let ans = $state(0);
	let error = $state('');
	let flash = $state(0);
	let history = $state<{ expr: string; result: string; value: number }[]>([]);
	let second = $state(false); // "2nd" shows the inverse / alternate function on keys that have one

	const OPS = ['+', '−', '×', '÷', '^'];
	const preview = $derived.by(() => {
		if (!expr || /^[\d.]+$/.test(expr)) return '';
		try {
			return formatResult(evaluate(expr, { angle, ans }));
		} catch {
			return '';
		}
	});
	// Top line: what you typed (or the finished sum). Big line: the live answer.
	const topLine = $derived(error ? error : fresh && history[0] ? `${history[0].expr} =` : expr);
	const bigLine = $derived(
		fresh ? formatResult(ans) : preview || (expr === '' ? '0' : /^[−\d.]+$/.test(expr) ? expr : '')
	);

	function insert(s: string) {
		error = '';
		const startsFresh = fresh && /^[\d.(πℯ√∛]|^(sin|cos|tan|ln|log|abs)/.test(s);
		if (startsFresh) expr = '';
		fresh = false;
		const last = expr.slice(-1);
		if (OPS.includes(s) && OPS.includes(last) && !(s === '−' && last !== '−')) {
			expr = expr.slice(0, -1) + s; // replace operator instead of stacking
			return;
		}
		if (s === '.') {
			const lastNum = /[\d.]*$/.exec(expr)?.[0] ?? '';
			if (lastNum.includes('.')) return;
			if (lastNum === '') s = '0.';
		}
		if (expr === '0' && /^\d$/.test(s)) expr = s;
		else expr += s;
	}

	function backspace() {
		error = '';
		fresh = false;
		const fn = /(sinh⁻¹\(|cosh⁻¹\(|tanh⁻¹\(|sin⁻¹\(|cos⁻¹\(|tan⁻¹\(|sinh\(|cosh\(|tanh\(|sin\(|cos\(|tan\(|ln\(|log\(|abs\(|√\(|∛\(|ℯ\^\(|10\^\(|×10\^|\^\(1÷|mod|Ans)$/.exec(expr);
		expr = fn ? expr.slice(0, -fn[0].length) : expr.slice(0, -1);
	}

	function clear() {
		expr = '';
		error = '';
		fresh = false;
	}

	function negate() {
		error = '';
		const m = /(^|[^\d.)])(−?)([\d.]+)$/.exec(expr);
		if (!m) {
			expr = expr === '' ? '−' : `−(${expr})`;
			return;
		}
		const start = m.index + m[1].length;
		expr = expr.slice(0, start) + (m[2] ? '' : '−') + m[3];
		fresh = false;
	}

	function equals() {
		if (!expr) return;
		try {
			const v = evaluate(expr, { angle, ans });
			const shown = formatResult(v);
			history = [{ expr, result: shown, value: v }, ...history].slice(0, 12);
			ans = v;
			// Keep full precision for chaining, without grouping commas.
			expr = Number.isFinite(v) ? String(Number(v.toPrecision(12))).replace('-', '−') : '';
			fresh = true;
			error = '';
		} catch (e) {
			error = e instanceof ExprError ? e.message : 'Error';
		}
	}


	type Key = {
		k: string;
		label?: string;
		aria?: string;
		kind: 'num' | 'op' | 'fn' | 'eq' | 'util';
		act?: () => void;
		/** What the key does when "2nd" is on. */
		alt?: { k: string; label: string; aria: string };
	};
	const basicKeys: Key[] = [
		{ k: 'AC', kind: 'util', act: clear, aria: 'All clear' },
		{ k: '⌫', kind: 'util', act: backspace, aria: 'Delete' },
		{ k: '%', kind: 'util', aria: 'Percent' },
		{ k: '÷', kind: 'op', aria: 'Divide' },
		{ k: '7', kind: 'num' }, { k: '8', kind: 'num' }, { k: '9', kind: 'num' },
		{ k: '×', kind: 'op', aria: 'Multiply' },
		{ k: '4', kind: 'num' }, { k: '5', kind: 'num' }, { k: '6', kind: 'num' },
		{ k: '−', kind: 'op', aria: 'Minus' },
		{ k: '1', kind: 'num' }, { k: '2', kind: 'num' }, { k: '3', kind: 'num' },
		{ k: '+', kind: 'op', aria: 'Plus' },
		{ k: '±', kind: 'num', act: negate, aria: 'Change sign' },
		{ k: '0', kind: 'num' },
		{ k: '.', kind: 'num', aria: 'Decimal point' },
		{ k: '=', kind: 'eq', act: equals, aria: 'Equals' }
	];
	/** A random number in [0, 1) from the browser's cryptographic generator, 6 decimal places. */
	function rand() {
		const b = new Uint32Array(1);
		crypto.getRandomValues(b);
		insert((b[0] / 2 ** 32).toFixed(6));
	}
	// 5 columns × 5 rows. Keys with `alt` switch with "2nd", like a phone or desk scientific calculator.
	const sciKeys: Key[] = [
		{ k: '2nd', kind: 'util', aria: 'Second functions', act: () => (second = !second) },
		{ k: '(', kind: 'fn', aria: 'Open bracket' },
		{ k: ')', kind: 'fn', aria: 'Close bracket' },
		{ k: 'mod', kind: 'fn', aria: 'Modulo (remainder)' },
		{ k: 'Ans', kind: 'fn', aria: 'Last answer' },

		{ k: '^2', label: 'x²', kind: 'fn', aria: 'Square', alt: { k: '^3', label: 'x³', aria: 'Cube' } },
		{ k: '^', label: 'xʸ', kind: 'fn', aria: 'Power', alt: { k: '^(1÷', label: 'ʸ√x', aria: 'Y-th root' } },
		{ k: '√(', label: '√x', kind: 'fn', aria: 'Square root', alt: { k: '∛(', label: '∛x', aria: 'Cube root' } },
		{ k: '^(−1)', label: '1/x', kind: 'fn', aria: 'Reciprocal' },
		{ k: '!', label: 'x!', kind: 'fn', aria: 'Factorial' },

		{ k: 'sin(', label: 'sin', kind: 'fn', aria: 'Sine', alt: { k: 'sin⁻¹(', label: 'sin⁻¹', aria: 'Inverse sine' } },
		{ k: 'cos(', label: 'cos', kind: 'fn', aria: 'Cosine', alt: { k: 'cos⁻¹(', label: 'cos⁻¹', aria: 'Inverse cosine' } },
		{ k: 'tan(', label: 'tan', kind: 'fn', aria: 'Tangent', alt: { k: 'tan⁻¹(', label: 'tan⁻¹', aria: 'Inverse tangent' } },
		{ k: 'π', kind: 'fn', aria: 'Pi' },
		{ k: 'e', kind: 'fn', aria: 'Euler’s number' },

		{ k: 'sinh(', label: 'sinh', kind: 'fn', aria: 'Hyperbolic sine', alt: { k: 'sinh⁻¹(', label: 'sinh⁻¹', aria: 'Inverse hyperbolic sine' } },
		{ k: 'cosh(', label: 'cosh', kind: 'fn', aria: 'Hyperbolic cosine', alt: { k: 'cosh⁻¹(', label: 'cosh⁻¹', aria: 'Inverse hyperbolic cosine' } },
		{ k: 'tanh(', label: 'tanh', kind: 'fn', aria: 'Hyperbolic tangent', alt: { k: 'tanh⁻¹(', label: 'tanh⁻¹', aria: 'Inverse hyperbolic tangent' } },
		{ k: 'ln(', label: 'ln', kind: 'fn', aria: 'Natural log', alt: { k: 'ℯ^(', label: 'eˣ', aria: 'e to the power' } },
		{ k: 'log(', label: 'log', kind: 'fn', aria: 'Log base 10', alt: { k: '10^(', label: '10ˣ', aria: '10 to the power' } },

		{ k: 'abs(', label: '|x|', kind: 'fn', aria: 'Absolute value' },
		{ k: 'C', label: 'nCr', kind: 'fn', aria: 'Combinations' },
		{ k: 'P', label: 'nPr', kind: 'fn', aria: 'Permutations' },
		{ k: '×10^', label: 'EE', kind: 'fn', aria: 'Times ten to the power' },
		{ k: 'rand', label: 'Rand', kind: 'fn', aria: 'Random number', act: rand }
	];
	const shown = (key: Key) => (second && key.alt ? key.alt : key);

	function press(key: Key) {
		if (key.act) return key.act();
		const useAlt = second && !!key.alt;
		const k = useAlt ? key.alt!.k : key.k;
		// Euler's number goes in as "ℯ" so "2", "e", "3" reads as 2·e·3, never as 2e3 (= 2,000).
		insert(k === 'e' ? 'ℯ' : k);
		if (useAlt) second = false; // one-shot, like SHIFT on a desk calculator
	}

	const keyClass: Record<Key['kind'], string> = {
		num: 'bg-fill text-label hover:bg-fill-strong',
		op: 'bg-accent/12 text-accent-text text-title2 hover:bg-accent/20',
		util: 'bg-fill-strong text-label hover:brightness-95',
		fn: 'bg-fill text-label text-subhead hover:bg-fill-strong',
		eq: 'bg-accent text-white text-title2 hover:brightness-110'
	};

	onMount(() => {
		if (!keyboard) return;
		const onKey = (e: KeyboardEvent) => {
			const t = e.target as HTMLElement;
			if (t.closest('input, textarea, select, [contenteditable="true"]')) return;
			if (e.metaKey || e.ctrlKey || e.altKey) return;
			const map: Record<string, string> = { '*': '×', '/': '÷', '-': '−', x: '×' };
			const k = e.key;
			if (/^[\d.+()^%!]$/.test(k)) insert(k);
			else if (k in map) insert(map[k]);
			else if (k === 'Enter' || k === '=') {
				// Let Enter activate a focused button normally.
				if (t.tagName === 'BUTTON' && k === 'Enter') return;
				equals();
			} else if (k === 'Backspace') backspace();
			else if (k === 'Escape' || k === 'Delete') clear();
			else return;
			e.preventDefault();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});
</script>

<section aria-label={label} class="@container rounded-[1.75rem] bg-surface p-3 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_32px_rgb(0_0_0/0.06)] sm:p-4">
	<div class="flex items-center justify-between gap-2 px-1 pb-3">
		{#if allowModeSwitch}
			<div class="flex rounded-[10px] bg-fill p-[3px] text-footnote font-medium" role="group" aria-label="Calculator mode">
				{#each [['basic', 'Basic'], ['scientific', 'Scientific']] as [m, l] (m)}
					<button
						type="button"
						aria-pressed={mode === m}
						onclick={() => (mode = m as 'basic')}
						class="min-h-9 rounded-lg px-3 {mode === m ? 'bg-surface font-semibold shadow-[0_1px_3px_rgb(0_0_0/0.12)]' : ''}"
						>{l}</button
					>
				{/each}
			</div>
		{:else}
			<span></span>
		{/if}
		{#if mode === 'scientific'}
			<button
				type="button"
				onclick={() => (angle = angle === 'deg' ? 'rad' : 'deg')}
				aria-label="Angle unit: {angle === 'deg' ? 'degrees' : 'radians'}. Switch."
				class="min-h-9 rounded-lg bg-fill px-3 text-footnote font-semibold uppercase"
				>{angle}</button
			>
		{/if}
	</div>

	<!-- Display: fixed height so nothing moves while typing. -->
	<div class="mb-3 flex h-28 flex-col items-end justify-end overflow-hidden rounded-2xl bg-canvas px-4 py-3">
		<div class="tabular w-full overflow-x-auto text-right text-title3 whitespace-nowrap text-label-2 [direction:rtl] [scrollbar-width:none]">
			<span class="[direction:ltr] [unicode-bidi:embed] {error ? 'text-danger' : ''}">{topLine || '\u00a0'}</span>
		</div>
		<div class="flex w-full items-center justify-end gap-2" aria-live="polite">
			{#key flash}
				<output class="tabular truncate rounded-lg px-1 text-[2.5rem] leading-tight font-semibold tracking-tight text-label {flash ? 'gc-flash' : ''}">
					{bigLine || '\u00a0'}
				</output>
			{/key}
		</div>
	</div>

	<!-- Side by side only when the calculator itself is wide enough (container query, not screen width). -->
	<div class="flex flex-col gap-2.5 {mode === 'scientific' ? '@2xl:flex-row @2xl:gap-3' : ''}">
		{#if mode === 'scientific'}
			<div class="grid grid-cols-5 gap-1.5 @2xl:w-[46%] @2xl:content-start @2xl:gap-2">
				{#each sciKeys as key (key.k)}
					{@const s = shown(key)}
					<button
						type="button"
						onclick={() => press(key)}
						aria-label={s.aria ?? key.label ?? key.k}
						aria-pressed={key.k === '2nd' ? second : undefined}
						class="flex h-11 min-w-0 items-center justify-center rounded-xl px-0.5 text-[0.9375rem] leading-none font-medium whitespace-nowrap transition-colors active:scale-[0.97] @2xl:h-12 {key.k === '2nd' && second
							? 'bg-accent text-white'
							: key.alt && second
								? 'bg-accent/12 text-accent-text'
								: keyClass[key.kind]}"
						>{s.label ?? key.k}</button
					>
				{/each}
			</div>
		{/if}
		<div class="grid flex-1 grid-cols-4 gap-2 @2xl:content-start">
			{#each basicKeys as key (key.k)}
				<button
					type="button"
					onclick={() => press(key)}
					aria-label={key.aria ?? key.k}
					class="rounded-2xl text-title3 font-medium transition-colors active:scale-[0.97] {mode === 'scientific'
						? 'h-12'
						: 'h-14 sm:h-15'} {keyClass[key.kind]}"
					>{#if key.k === '⌫'}<Icon name="deleteLeft" size={22} strokeWidth={1.8} class="mx-auto" />{:else}{key.k}{/if}</button
				>
			{/each}
		</div>
	</div>

	{#if history.length}
		<details class="group mt-3 rounded-2xl bg-canvas">
			<summary class="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 text-subhead font-medium [&::-webkit-details-marker]:hidden">
				History ({history.length})
				<span class="text-label-2 transition-transform group-open:rotate-180"><Icon name="chevronDown" size={18} /></span>
			</summary>
			<ul class="max-h-56 overflow-auto px-2 pb-2">
				{#each history as h, i (i)}
					<li>
						<button
							type="button"
							onclick={() => {
								expr = h.expr;
								fresh = false;
								error = '';
							}}
							class="tabular flex w-full flex-col items-end rounded-xl px-3 py-2 text-right hover:bg-fill"
						>
							<span class="text-footnote text-label-2">{h.expr} =</span>
							<span class="font-semibold">{h.result}</span>
						</button>
					</li>
				{/each}
			</ul>
		</details>
	{/if}

	<div class="mt-2 flex justify-end px-1">
		<CopyButton
			variant="link"
			label="Copy result"
			getText={() => bigLine.replace(/,/g, '').replace(/−/g, '-').trim()}
			oncopied={() => flash++}
		/>
	</div>
</section>
