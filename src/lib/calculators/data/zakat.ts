/**
 * Zakat on wealth. Verified 2026-10-28.
 * Islamic Relief (islamicrelief.org.au nisab page): nisab is "85 grams of gold and 595 grams of silver"
 * (an alternative opinion gives 87.48 g gold and 612.36 g silver); the Hanafi school uses silver, other
 * schools use gold; zakat is due one lunar year (hawl, 354 days) after wealth reaches nisab.
 * Zakat Foundation of America (zakat.org): "Zakat is 2.5 percent of qualifying wealth", paid after one
 * lunar year; only necessary debts that are due can be deducted; receivables and trade goods count.
 */
export const ZAKAT_RATE = 0.025;
export const NISAB_GOLD_GRAMS = 85;
export const NISAB_SILVER_GRAMS = 595;

export const ZAKAT_SOURCES = [
	{ title: 'Islamic Relief: Nisab (gold and silver thresholds, lunar year)', url: 'https://islamicrelief.org.au/our-work/islamic-giving/nisab/' },
	{ title: 'Zakat Foundation of America: Nisab and zakat calculation in a nutshell', url: 'https://zakat.org/nisab-and-zakat-calculation-in-a-nutshell' }
];
