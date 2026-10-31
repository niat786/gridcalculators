import type { IconName } from '../icons';
import type { CategoryId } from './types';

export interface Category {
	id: CategoryId;
	/** URL segment: /finance-calculators */
	slug: string;
	name: string;
	/** Short line for cards. */
	tagline: string;
	metaTitle: string;
	metaDescription: string;
	/** Paragraph at the top of the category page. */
	intro: string;
	icon: IconName;
	/** Tailwind color token name (see app.css). Color is never the only cue: icon + label always ship with it. */
	tone: 'finance' | 'health' | 'math' | 'everyday' | 'developer';
	/** schema.org applicationCategory for calculators in this category. */
	schemaCategory: string;
}

export const CATEGORIES: Category[] = [
	{
		id: 'finance',
		slug: 'finance-calculators',
		name: 'Finance',
		tagline: 'Loans, savings, tax and retirement',
		metaTitle: 'Finance Calculators — Mortgage, Loan & Interest',
		metaDescription:
			'Free finance calculators for mortgages, loans, compound interest, retirement and tax. Clear results, full formulas and amortization schedules.',
		intro:
			'Plan big money decisions with calculators that show every number they use. Mortgages, loans, savings and more, with formulas and schedules you can check.',
		icon: 'banknote',
		tone: 'finance',
		schemaCategory: 'FinanceApplication'
	},
	{
		id: 'health',
		slug: 'health-calculators',
		name: 'Fitness & Health',
		tagline: 'Body, nutrition and pregnancy',
		metaTitle: 'Health & Fitness Calculators — BMI, Calories & More',
		metaDescription:
			'Free health and fitness calculators: BMI, calories, body fat, BMR and pregnancy dates. Based on published medical formulas, explained step by step.',
		intro:
			'Health and fitness calculators built on published formulas from organisations like the WHO and CDC. Use them as a starting point, not as medical advice.',
		icon: 'heartPulse',
		tone: 'health',
		schemaCategory: 'HealthApplication'
	},
	{
		id: 'math',
		slug: 'math-calculators',
		name: 'Math',
		tagline: 'Algebra, statistics and geometry',
		metaTitle: 'Math Calculators — Percentage, Fractions & Statistics',
		metaDescription:
			'Free math calculators for percentages, fractions, statistics and geometry. Instant answers with the formula and a worked example for every problem.',
		intro:
			'Math calculators that show their working. Every answer comes with the formula and a worked example, so you can learn the method as well as get the result.',
		icon: 'sigma',
		tone: 'math',
		schemaCategory: 'EducationalApplication'
	},
	{
		id: 'everyday',
		slug: 'everyday-calculators',
		name: 'Everyday',
		tagline: 'Dates, time, units and school',
		metaTitle: 'Everyday Calculators — Age, Dates, Time & Units',
		metaDescription:
			'Free everyday calculators for age, date differences, time, GPA and unit conversions. Fast, private and easy to use on any device.',
		intro:
			'Quick answers for everyday questions: how old, how long, how many days. Simple calculators that work instantly on your phone.',
		icon: 'clock',
		tone: 'everyday',
		schemaCategory: 'UtilitiesApplication'
	},
	{
		id: 'developer',
		slug: 'developer-tools',
		name: 'Developer & Media',
		tagline: 'Images, video, color and code',
		metaTitle: 'Developer & Media Tools — Images, Video & Color',
		metaDescription:
			'Free developer and media tools that run in your browser: image compression, aspect ratios, bitrates and color conversion. Nothing is uploaded.',
		intro:
			'Developer and media tools that run entirely in your browser. Your files never leave your device.',
		icon: 'code',
		tone: 'developer',
		schemaCategory: 'DeveloperApplication'
	}
];

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<
	CategoryId,
	Category
>;

export const CATEGORY_BY_SLUG = Object.fromEntries(CATEGORIES.map((c) => [c.slug, c])) as Record<
	string,
	Category
>;
