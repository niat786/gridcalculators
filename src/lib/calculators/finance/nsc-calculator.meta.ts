import { defineMeta } from '../types';

export default defineMeta({
	slug: 'nsc-calculator',
	name: 'NSC Calculator (National Savings Certificate)',
	category: 'finance',
	shortDescription: 'NSC maturity value and interest after 5 years at the current rate',
	metaTitle: 'NSC Calculator — 5-Year Maturity Value and Interest',
	metaDescription:
		'Free NSC calculator. See the maturity value and interest on a National Savings Certificate at the current rate, compounded yearly, with a year table.',
	icon: 'receipt',
	keywords: ['nsc calculator', 'national savings certificate', 'nsc interest rate', 'nsc maturity amount', 'post office nsc', 'nsc 5 year'],
	region: 'IN',
	regionNote: 'Uses the Indian post office NSC rules and the October–December 2026 rate. The scheme exists only in India.',
	money: 'INR',
	related: ['ppf-calculator', 'kvp-calculator', 'fd-calculator', 'sukanya-samriddhi-calculator', 'india-income-tax-calculator', 'scss-calculator'],
	updated: '2026-10-28'
});
