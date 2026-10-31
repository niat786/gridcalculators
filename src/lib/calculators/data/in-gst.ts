/**
 * India GST rate slabs after the GST 2.0 rationalisation (56th GST Council meeting, 3 Sep 2025;
 * rates notified 17 Sep 2025, in force from 22 Sep 2025). The 12% and 28% slabs were removed.
 * Official home: https://www.cbic-gst.gov.in/ and https://gstcouncil.gov.in/ — not fetchable from the build
 * environment, so each rate was confirmed in at least two independent published sources.
 *
 * Sources: SCC Online, 18 Sep 2025 (https://www.scconline.com/blog/post/2025/09/18/new-gst-rates-notifed-wef-22-september/amp):
 * "gold and silver jewellery 3%, precious stones and diamonds 0.25%, rate effective 22 Sep 2025";
 * KKS Capital (https://www.kkscapital.com/blog/new-gst-rate-in-2026/): 0/5/18/40 plus special 3%, 1.5%, 0.25%, no change after Sep 2025;
 * HCI India (https://hciindia.in/learn/accounting/gst/basics/gst-rates-and-slabs-in-india/): same slabs, 3% gold and 0.25% rough diamonds.
 * Tobacco products still sit at 28% plus compensation cess during a transition and are NOT offered here.
 */
export const GST_RATES_EFFECTIVE = '22 September 2025';

export interface GstSlab {
	rate: number;
	label: string;
}

export const GST_SLABS: GstSlab[] = [
	{ rate: 0, label: '0% (nil / exempt)' },
	{ rate: 0.25, label: '0.25% (rough diamonds and precious stones)' },
	{ rate: 1.5, label: '1.5% (cut and polished diamonds)' },
	{ rate: 3, label: '3% (gold, silver, jewellery)' },
	{ rate: 5, label: '5% (merit rate)' },
	{ rate: 18, label: '18% (standard rate)' },
	{ rate: 40, label: '40% (luxury and sin goods)' }
];

export const GST_DEFAULT_RATE = 18;

export const GST_SOURCE = { title: 'CBIC — GST rates and notifications', url: 'https://www.cbic-gst.gov.in/' };
export const GST_COUNCIL_SOURCE = { title: 'GST Council', url: 'https://gstcouncil.gov.in/' };
