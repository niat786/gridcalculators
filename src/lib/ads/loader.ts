import { ADSENSE_CLIENT } from './config';

declare global {
	interface Window {
		adsbygoogle?: unknown[] & { requestNonPersonalizedAds?: number };
	}
	interface Navigator {
		/** Global Privacy Control (https://globalprivacycontrol.org). */
		globalPrivacyControl?: boolean;
	}
}

/**
 * Respect Global Privacy Control: if the browser sends the signal, ask Google for non-personalised ads only.
 * (Google's documented AdSense setting; it must be set before any ad request.) Promised in /privacy.
 */
function applyPrivacySignals() {
	if (navigator.globalPrivacyControl === true) {
		const q = (window.adsbygoogle = window.adsbygoogle || []);
		q.requestNonPersonalizedAds = 1;
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
			applyPrivacySignals();
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
