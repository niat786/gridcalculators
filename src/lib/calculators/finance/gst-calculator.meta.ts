import { defineMeta } from '../types';

export default defineMeta({
	slug: 'gst-calculator',
	name: 'GST Calculator',
	category: 'finance',
	shortDescription: 'Add or remove GST with the current Indian slabs',
	metaTitle: 'GST Calculator — Add or Remove GST (India 2026)',
	metaDescription:
		'Free GST calculator for India. Add GST to a price or remove it from a GST-inclusive price using the current slabs, with the CGST, SGST and IGST split.',
	icon: 'receipt',
	keywords: ['gst calculator', 'gst calculator india', 'add gst', 'remove gst', 'reverse gst calculator', 'cgst sgst igst calculator'],
	related: ['vat-calculator', 'sales-tax-calculator', 'discount-calculator', 'percentage-calculator', 'india-income-tax-calculator', 'advance-tax-calculator'],
	updated: '2026-10-28',
	region: 'IN',
	money: 'INR',
	regionNote: 'Uses Indian GST slabs in force since 22 September 2025 (GST 2.0). For other countries use a VAT or sales tax calculator.'
});
