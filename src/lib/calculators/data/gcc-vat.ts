/**
 * Standard VAT rates in the six GCC states. Verified 2026-10-28 against PwC Worldwide Tax Summaries
 * (Saudi Arabia), Avalara (Bahrain), CMS Law (Oman), Middle East Briefing (UAE), and taxnews.ae and
 * taxadvisors.ae (Qatar and Kuwait: no domestic VAT in force as of mid/Oct 2026). Authorities: ZATCA,
 * UAE FTA, Bahrain NBR, Oman Tax Authority.
 */
export interface GccCountry {
	value: string;
	label: string;
	currency: 'AED' | 'SAR' | 'BHD' | 'OMR' | 'QAR' | 'KWD';
	/** Standard VAT rate in percent. 0 means no VAT is in force. */
	rate: number;
	/** Minor-unit digits of the currency. */
	decimals: 2 | 3;
	note: string;
}

export const GCC_COUNTRIES: GccCountry[] = [
	// UAE: 5% since 1 Jan 2018, unchanged.
	{ value: 'AE', label: 'United Arab Emirates', currency: 'AED', rate: 5, decimals: 2, note: 'UAE standard rate, since 1 January 2018.' },
	// Saudi Arabia: PwC Tax Summaries: "15%, effective 1 July 2020" (raised from 5%).
	{ value: 'SA', label: 'Saudi Arabia', currency: 'SAR', rate: 15, decimals: 2, note: 'Saudi standard rate, since 1 July 2020.' },
	// Bahrain: 10%, since January 2022 (raised from 5%).
	{ value: 'BH', label: 'Bahrain', currency: 'BHD', rate: 10, decimals: 3, note: 'Bahrain standard rate, since January 2022.' },
	// Oman: 5% under Royal Decree 121/2020, since 16 April 2021.
	{ value: 'OM', label: 'Oman', currency: 'OMR', rate: 5, decimals: 3, note: 'Oman standard rate, since 16 April 2021.' },
	// Qatar: no VAT enacted or in force; no implementation date announced (taxadvisors.ae, Oct 2026).
	{ value: 'QA', label: 'Qatar', currency: 'QAR', rate: 0, decimals: 2, note: 'Qatar has no VAT in force, so the rate is 0%.' },
	// Kuwait: no VAT enacted or in force (taxnews.ae, mid-2026).
	{ value: 'KW', label: 'Kuwait', currency: 'KWD', rate: 0, decimals: 3, note: 'Kuwait has no VAT in force, so the rate is 0%.' }
];

export const GCC_VAT_AS_OF = 'October 2026';

export const GCC_VAT_SOURCES = [
	{ title: 'PwC Worldwide Tax Summaries: Saudi Arabia, other taxes (VAT 15%)', url: 'https://taxsummaries.pwc.com/saudi-arabia/corporate/other-taxes' },
	{ title: 'Saudi Arabia ZATCA (VAT authority)', url: 'https://zatca.gov.sa' },
	{ title: 'UAE Federal Tax Authority (VAT 5%)', url: 'https://tax.gov.ae' }
];
