import { defineMeta } from '../types';

export default defineMeta({
	slug: 'inflation-calculator',
	name: 'Inflation Calculator',
	category: 'finance',
	shortDescription: 'What a dollar amount from any year since 1913 is worth today.',
	metaTitle: 'Inflation Calculator — Value of a Dollar Since 1913',
	metaDescription:
		'Free US inflation calculator using official CPI data from 1913 to today. See what money from any year is worth now, or project future prices at any rate.',
	icon: 'trendingUp',
	keywords: ['inflation', 'cpi', 'value of a dollar', 'buying power', 'inflation rate', 'dollar worth'],
	related: ['retirement-calculator', 'compound-interest-calculator', 'social-security-calculator', 'savings-calculator', 'future-value-calculator', 'salary-calculator'],
	region: 'US',
	regionNote: 'Past values use the US Consumer Price Index. For another country, use the “future cost” mode with your local inflation rate.',
	money: 'USD',
	updated: '2026-10-28'
});
