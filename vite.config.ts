import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

/**
 * Content Security Policy.
 * Pages are prerendered, so SvelteKit writes this into a <meta http-equiv> tag and adds
 * sha256 hashes for its own inline bootstrap script. Inline <script> injection (the main
 * XSS vector) is therefore blocked. `frame-ancestors` cannot be set via <meta>; it is sent
 * as a real header from static/_headers.
 *
 * AdSense note: external https scripts are allowed so Google's ad scripts can load once
 * PUBLIC_ADSENSE_CLIENT is set. If Google's ad code ever needs `'unsafe-eval'`, add it to
 * script-src here — nowhere else.
 */
const csp = {
	mode: 'hash' as const,
	directives: {
		'default-src': ['self' as const],
		'script-src': ['self' as const, 'https:' as const],
		'style-src': ['self' as const, 'unsafe-inline' as const],
		'img-src': ['self' as const, 'data:' as const, 'https:' as const],
		'font-src': ['self' as const],
		'connect-src': ['self' as const, 'https:' as const],
		'frame-src': ['https:' as const],
		'object-src': ['none' as const],
		'base-uri': ['self' as const],
		'form-action': ['self' as const],
		'upgrade-insecure-requests': true
	}
};

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// Every page is prerendered to static HTML. No server, no database.
			// Cloudflare Pages compresses at the edge, so no .br/.gz copies are needed.
			adapter: adapter({ precompress: false, strict: true }),
			csp,
			paths: { origin: 'https://gridcalculators.com' },
			// The route manifest is not shipped to the browser: smaller JS on first load,
			// which matters once there are hundreds of calculator routes.
			router: { resolution: 'server' },
			// Inline the stylesheet into each page (like AMP) to remove a render-blocking request.
			inlineStyleThreshold: 60_000,
			prerender: { entries: ['*', '/404'], handleMissingId: 'fail', handleHttpError: 'fail' }
		})
	],
	build: { target: 'es2022', cssMinify: 'lightningcss' }
});
