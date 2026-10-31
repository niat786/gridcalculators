/**
 * Countries (and groups) a calculator can be limited to. The code is shown as a badge on the page
 * and on cards; `the` is used in sentences ("For the United Kingdom only").
 * Add a country here before using it in a calculator's meta.
 */
export const REGIONS = {
	US: { name: 'United States', the: 'the United States' },
	UK: { name: 'United Kingdom', the: 'the United Kingdom' },
	CA: { name: 'Canada', the: 'Canada' },
	AU: { name: 'Australia', the: 'Australia' },
	NZ: { name: 'New Zealand', the: 'New Zealand' },
	IN: { name: 'India', the: 'India' },
	PK: { name: 'Pakistan', the: 'Pakistan' },
	BD: { name: 'Bangladesh', the: 'Bangladesh' },
	AE: { name: 'United Arab Emirates', the: 'the UAE' },
	SA: { name: 'Saudi Arabia', the: 'Saudi Arabia' },
	QA: { name: 'Qatar', the: 'Qatar' },
	KW: { name: 'Kuwait', the: 'Kuwait' },
	OM: { name: 'Oman', the: 'Oman' },
	BH: { name: 'Bahrain', the: 'Bahrain' },
	GCC: { name: 'Gulf Cooperation Council countries', the: 'the Gulf (GCC) countries' },
	PH: { name: 'Philippines', the: 'the Philippines' },
	NG: { name: 'Nigeria', the: 'Nigeria' },
	ZA: { name: 'South Africa', the: 'South Africa' },
	KE: { name: 'Kenya', the: 'Kenya' },
	MY: { name: 'Malaysia', the: 'Malaysia' },
	SG: { name: 'Singapore', the: 'Singapore' }
} as const;

export type RegionCode = keyof typeof REGIONS;
