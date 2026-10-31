import type { CategoryId } from './calculators/types';

/**
 * Full class strings per category so Tailwind can see them at build time
 * (never build class names dynamically like `bg-${tone}`).
 */
export const TONE_TILE: Record<CategoryId, string> = {
	finance: 'bg-finance/12 text-finance',
	health: 'bg-health/12 text-health',
	math: 'bg-math/12 text-math',
	everyday: 'bg-everyday/12 text-everyday',
	developer: 'bg-developer/12 text-developer'
};
