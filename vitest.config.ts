import { defineConfig } from 'vitest/config';

// Plain Node tests for the pure calculator logic (no SvelteKit plugin needed).
export default defineConfig({
	// tsconfig.json extends SvelteKit's generated config; tests don't need it.
	oxc: { tsconfig: false },
	test: { include: ['src/**/*.test.ts'], environment: 'node' }
});
