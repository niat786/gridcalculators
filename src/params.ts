import { defineParams } from '@sveltejs/kit/params';
import { CATEGORY_BY_SLUG } from '#lib/calculators/categories.ts';

// Route matchers for /[slug=category] and /[slug=calculator].
// This file is loaded by Node directly at build time, so it must not import anything that
// uses Vite features (like import.meta.glob). Unknown calculator slugs are rejected by the
// page's load function with a 404, and only real calculators are prerendered.
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const params = defineParams({
	category: (param) => (param in CATEGORY_BY_SLUG ? param : undefined),
	calculator: (param) => (SLUG.test(param) && !(param in CATEGORY_BY_SLUG) ? param : undefined)
});
