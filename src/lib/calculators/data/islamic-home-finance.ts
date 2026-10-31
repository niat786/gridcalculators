/**
 * Islamic home finance structures. No statutory rate or limit is involved: the maths is the standard definition of each
 * contract, and the default rates in the calculator are examples only. Verified 2026-10-28 against:
 *  - LoanStreet Malaysia, "Islamic home loans explained": Murabaha / BBA has a "Fixed Profit Rate e.g. 10% p.a. which determines
 *    the Sale Price"; "the Sale Price divided by the number of months gives the Monthly Instalment". Musharakah Mutanaqisah: the
 *    bank leases its share back at a rent that covers principal repayment plus profit, and the bank's ownership falls over time.
 *  - HalalWallet, Murabaha vs Musharakah: Murabaha mark-up "is fixed at contract signing and cannot change", paid in fixed
 *    instalments; Musharakah pays "a rent on the portion still owned by the financier", which shrinks as the customer buys the
 *    share and is "typically re-benchmarked periodically", so payments can vary.
 *  - Holo, guide to Islamic mortgage financing: Murabaha total price locked at signing; Diminishing Musharaka payment = rent on the
 *    bank's share plus the purchase of further units of it.
 *
 * Murabaha:  profit = financed amount x flat rate x years;  instalment = (financed amount + profit) / months.
 *   The flat rate is applied to the amount the bank finances (price minus down payment), because that is the part of the property
 *   the bank buys and resells on credit; the customer's own down payment earns the bank nothing.
 * Diminishing Musharakah / Ijara with equal total payments is the reducing-balance annuity at the rent rate:
 *   payment = financed x r / (1 - (1 + r)^-n), r = annual rate / 12, n = months.
 */
export const IHF_LABEL = 'Murabaha and Diminishing Musharakah / Ijara';

export const IHF_MAX_YEARS = 40;

export const IHF_SOURCES = [
	{ title: 'LoanStreet: Islamic home loans explained (BBA / Murabaha and Musharakah Mutanaqisah)', url: 'https://loanstreet.com.my/learning-centre/islamic-home-loans-explained' },
	{ title: 'HalalWallet: Murabaha vs Musharakah', url: 'https://www.halalwallet.us/compare/concepts/murabaha-vs-musharakah' },
	{ title: 'Holo: guide to Islamic mortgage financing (Murabaha, Musharaka and Ijara)', url: 'https://www.useholo.com/en/blog/the-complete-guide-to-islamic-mortgage-financing-murabaha-musharaka-and-ijara-explained' }
];
