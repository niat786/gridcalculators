import { defineMeta } from '../types';

export default defineMeta({
	slug: 'canada-income-tax-calculator',
	name: 'Canada Income Tax Calculator',
	category: 'finance',
	shortDescription: 'Federal and provincial tax, average and marginal rate for 2026',
	metaTitle: 'Canada Income Tax Calculator 2026 — Federal + Provincial',
	metaDescription:
		'Free Canada income tax calculator for 2026. Pick your province or territory to see federal and provincial tax, CPP and EI credits, and your marginal rate.',
	icon: 'receipt',
	keywords: [
		'canada income tax calculator',
		'2026 tax calculator canada',
		'federal and provincial tax',
		'marginal tax rate canada',
		'ontario tax calculator',
		'bc tax calculator'
	],
	region: 'CA',
	related: ['canada-take-home-pay-calculator', 'rrsp-calculator', 'tfsa-calculator', 'cpp-calculator', 'canada-sales-tax-calculator', 'canada-mortgage-stress-test-calculator'],
	regionNote: 'It uses Canada’s 2026 federal and provincial rules (Quebec is not included yet). For other countries, use that country’s tax calculator.',
	money: 'CAD',
	updated: '2026-10-28'
});
