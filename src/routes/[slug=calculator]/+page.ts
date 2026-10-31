import { error } from '@sveltejs/kit';
import type { Component } from 'svelte';
import { loadCalculator } from '#lib/calculators/loaders.ts';
import type { PageLoad } from './$types';

// Interactive widgets that replace the input form. Loaded only on pages that use them.
const WIDGETS: Record<string, () => Promise<{ default: Component<any> }>> = {
	keypad: () => import('#lib/components/keypad/KeypadCalculator.svelte'),
	random: () => import('#lib/components/widgets/RandomNumber.svelte'),
	password: () => import('#lib/components/widgets/PasswordGenerator.svelte'),
	currency: () => import('#lib/components/widgets/CurrencyConverter.svelte'),
	dice: () => import('#lib/components/widgets/DiceRoller.svelte')
};

// Universal load: the config holds functions (the math), so it can't be serialized.
// It is imported here instead, as a small per-calculator chunk.
export const load: PageLoad = async ({ params, data }) => {
	const config = await loadCalculator(params.slug);
	if (!config) error(404, 'Calculator not found');
	const widget = config.widget ? (await WIDGETS[config.widget.name]()).default : null;
	return { ...data, config, widget };
};
