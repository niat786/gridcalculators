/**
 * Lazy loaders for full calculator configs. Each *.calc.ts becomes its own small JS chunk,
 * downloaded only on that calculator's page.
 */
import type { CalculatorConfig } from './types';

const loaders = import.meta.glob<CalculatorConfig>('./*/*.calc.ts', { import: 'default' });

const bySlug: Record<string, () => Promise<CalculatorConfig>> = {};
for (const [path, load] of Object.entries(loaders)) {
	// File name = slug: ./health/bmi-calculator.calc.ts → bmi-calculator
	const slug = path.split('/').pop()!.replace('.calc.ts', '');
	bySlug[slug] = load;
}

export function loadCalculator(slug: string): Promise<CalculatorConfig> | undefined {
	return bySlug[slug]?.();
}
