/**
 * Islamic inheritance (Faraid), Sunni, Hanafi majority view. Verified 2026-10-28 against the sources listed below; the
 * fixed shares are the Quranic fractions (Surah an-Nisa 4:11, 4:12, 4:176), and the points where the schools differ are
 * written into the comments next to each rule.
 *
 * Sources read:
 *  - islam.wiki, "Fixed-share heirs (Ashab al-Furud)": husband 1/2 or 1/4; wives 1/4 or 1/8 shared equally, the total does not
 *    grow with their number; mother 1/3, or 1/6 with children or two or more siblings; "Umariyyatain": with only a spouse, a
 *    mother and a father, the mother takes one third of what remains after the spouse; a grandfather inherits only in the
 *    father's absence and takes the father's shares; full sister 1/2, two or more 2/3, only with no children, father or
 *    grandfather.
 *  - al-islam.org (Five Schools of Islamic Law, chapter on the mother): the one-third-of-the-remainder rule applies when the
 *    father and a spouse are present; it does NOT apply when a grandfather replaces the father (Kashf al-haqa'iq: the mother then
 *    takes one third of the original estate). Hanafi, Shafi'i and Hanbali: two siblings are enough to reduce the mother's share.
 *  - islamqa.info answer 13632: brothers blocked by the father still reduce the mother to one sixth (majority view).
 *  - Darul Ifta Birmingham (Hanafi, citing As-Sirajiyyah): "in the presence of the grandfather, brothers and sisters will not
 *    inherit" (mother, grandfather and sister: mother 1/3, grandfather 2/3); and sisters become residuaries (asabah) with daughters
 *    and take only the remainder (wife 1/8, daughter 1/2, six sisters 6/16 together).
 *  - islamweb.net fatwa 333826, "Al-Minbariyyah": wife, father, mother and two daughters: base 24 raised to 27 by awl.
 *  - majalla.org on radd: the surplus goes back to the sharers except husband and wife, in proportion to their shares
 *    (mother 1/6 and daughter 1/2 give 1/4 and 3/4). Ibn Abd al-Barr is quoted for the consensus that no radd goes to a spouse.
 *  - jamiat.org.za and SeekersGuidance (Hanafi): funeral costs first, then debts in full, then bequests up to one third of what
 *    remains; a bequest to someone who is already an heir needs the other heirs' consent.
 */

/** [numerator, denominator] */
export type Fraction = readonly [number, number];

export const FARAID_SHARES = {
	/** Husband: 1/2 with no child, 1/4 with a child. */
	husbandNoChild: [1, 2] as Fraction,
	husbandChild: [1, 4] as Fraction,
	/** Wives together: 1/4 with no child, 1/8 with a child; shared equally. */
	wivesNoChild: [1, 4] as Fraction,
	wivesChild: [1, 8] as Fraction,
	/** Mother: 1/6 with a child or two or more siblings, otherwise 1/3. */
	motherReduced: [1, 6] as Fraction,
	motherFull: [1, 3] as Fraction,
	/** Umariyyatan: the mother takes this fraction of what is left after the spouse's share. */
	motherOfRemainder: [1, 3] as Fraction,
	/** Father or grandfather: 1/6 when there is a child. */
	fatherWithChild: [1, 6] as Fraction,
	/** One daughter (no son): 1/2. Two or more: 2/3 together. */
	daughterOne: [1, 2] as Fraction,
	daughtersMany: [2, 3] as Fraction,
	/** One full sister (no child, father, grandfather or brother): 1/2. Two or more: 2/3 together. */
	sisterOne: [1, 2] as Fraction,
	sistersMany: [2, 3] as Fraction
} as const;

/** Siblings needed to reduce the mother from 1/3 to 1/6 (Hanafi: two of either sex, even if they are blocked). */
export const FARAID_SIBLINGS_REDUCE_MOTHER = 2;

/** A son takes twice a daughter, a brother twice a sister (4:11, 4:176). */
export const FARAID_MALE_UNITS = 2;
export const FARAID_FEMALE_UNITS = 1;

/** A bequest may not exceed one third of the estate left after funeral costs and debts. */
export const FARAID_BEQUEST_CAP: Fraction = [1, 3];

export const FARAID_MAX_WIVES = 4;
export const FARAID_MAX_COUNT = 50;

export const FARAID_LAW_LABEL = 'Sunni (Hanafi) law of inheritance (Faraid)';

export const FARAID_SOURCES = [
	{ title: 'Fixed-share heirs (Ashab al-Furud) in Islamic inheritance', url: 'https://islam.wiki/articles/inheritance-shares-fixed-heirs' },
	{ title: 'Five Schools of Islamic Law: does the mother take one third of the remainder?', url: 'https://al-islam.org/node/43458' },
	{ title: 'Darul Ifta Birmingham (Hanafi): a sister with the grandfather', url: 'https://islamqa.org/hanafi/daruliftaa-birmingham/244978/inheritance-case-involving-a-sister-with-the-grandfather/' },
	{ title: 'Darul Ifta Birmingham (Hanafi): sisters as residuaries with a daughter', url: 'https://islamqa.org/hanafi/daruliftaa-birmingham/19825/inheritance-case/' },
	{ title: 'IslamWeb: father, mother, wife and two daughters (Al-Minbariyyah, awl)', url: 'https://islamweb.net/en/printfatwa.php?id=333826' },
	{ title: 'Majalla: the return (radd)', url: 'https://majalla.org/ilm/radd/' },
	{ title: 'Jamiatul Ulama: bequests and the one-third limit (Hanafi)', url: 'https://jamiat.org.za/what-are-the-shari-guidelines-regarding-bequests-in-a-will/' }
];
