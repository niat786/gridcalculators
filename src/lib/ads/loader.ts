import { ADSENSE_CLIENT } from './config';

declare global {
	interface Window {
		adsbygoogle?: unknown[];
	}
}

let scriptPromise: Promise<void> | null = null;

/**
 * Load adsbygoogle.js once, after the page is idle, so ads never compete with the
 * calculator for the main thread or delay Largest Contentful Paint.
 */
export function loadAdSense(): Promise<void> {
	if (!ADSENSE_CLIENT) return Promise.reject(new Error('AdSense not configured'));
	if (scriptPromise) return scriptPromise;
	scriptPromise = new Promise((resolve, reject) => {
		const inject = () => {
			const s = document.createElement('script');
			s.async = true;
			s.crossOrigin = 'anonymous';
			s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(ADSENSE_CLIENT)}`;
			s.onload = () => resolve();
			s.onerror = () => reject(new Error('AdSense failed to load'));
			document.head.appendChild(s);
		};
		if ('requestIdleCallback' in window) requestIdleCallback(inject, { timeout: 3000 });
		else setTimeout(inject, 1500);
	});
	return scriptPromise;
}
