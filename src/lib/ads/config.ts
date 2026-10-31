/**
 * AdSense settings. Leave ADSENSE_CLIENT empty until your AdSense account is approved.
 * While it is empty, ad slots render nothing in production (and a labelled placeholder in
 * `npm run dev`, so you can see where ads will go).
 *
 * Consent: turn on Google's "Privacy & messaging" GDPR message in your AdSense account.
 * Google's script then shows a certified consent banner to EEA/UK/Swiss visitors itself.
 */
export const ADSENSE_CLIENT = ''; // e.g. 'ca-pub-1234567890123456'

/** Ad unit IDs from AdSense → Ads → By ad unit. */
export const AD_SLOTS = {
	top: '',
	inContent: '',
	sidebar: ''
} as const;

export type AdPlacement = keyof typeof AD_SLOTS;
