import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './bac-calculator.meta';

/** Grams of pure alcohol in one "standard drink" by country (ethanol density 0.789 g/mL). */
const DRINKS: Record<string, { label: string; grams: number }> = {
	us: { label: 'US standard drink (14 g)', grams: 14 },
	uk: { label: 'UK unit (8 g)', grams: 8 },
	ca: { label: 'Canada standard drink (13.45 g)', grams: 13.45 },
	au: { label: 'Australia / NZ standard drink (10 g)', grams: 10 },
	who: { label: 'WHO / most of Europe (10 g)', grams: 10 },
	custom: { label: 'My own drink (size and strength)', grams: 0 }
};
const ETHANOL_DENSITY = 0.789;
/** Widmark body-water factors and average elimination rate. */
const R_MALE = 0.68;
const R_FEMALE = 0.55;
export const ELIMINATION = 0.015; // % BAC per hour

const custom = (v: InputValues) => v.drink === 'custom';
const kgUnits = (v: InputValues) => v.units === 'kg';
const lbUnits = (v: InputValues) => v.units === 'lb';

export function widmark(grams: number, kg: number, female: boolean, hours: number): number {
	const peak = (grams / ((female ? R_FEMALE : R_MALE) * kg * 1000)) * 100;
	return Math.max(0, peak - ELIMINATION * hours);
}

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'drink',
			label: 'Drink size',
			type: 'select',
			display: 'menu',
			default: 'us',
			options: Object.entries(DRINKS).map(([value, d]) => ({ label: d.label, value }))
		},
		{ id: 'count', label: 'Number of drinks', type: 'number', default: 4, min: 0, max: 50, step: 0.5 },
		{ id: 'ml', label: 'Size of each drink', type: 'number', default: 500, min: 1, max: 3000, suffix: 'mL', width: 'half', visibleWhen: custom, help: '355 mL can, 568 mL UK pint, 150 mL wine' },
		{ id: 'abv', label: 'Strength', type: 'number', default: 5, min: 0.1, max: 96, step: 0.1, suffix: '% ABV', width: 'half', visibleWhen: custom },
		{
			id: 'sex',
			label: 'Sex',
			type: 'select',
			display: 'segmented',
			default: 'male',
			options: [
				{ label: 'Male', value: 'male' },
				{ label: 'Female', value: 'female' }
			]
		},
		{
			id: 'units',
			label: 'Weight unit',
			type: 'select',
			display: 'segmented',
			default: 'kg',
			width: 'half',
			options: [
				{ label: 'kg', value: 'kg' },
				{ label: 'lb', value: 'lb' }
			]
		},
		{ id: 'kg', label: 'Body weight', type: 'number', default: 80, min: 30, max: 300, step: 0.5, suffix: 'kg', width: 'half', visibleWhen: kgUnits },
		{ id: 'lb', label: 'Body weight', type: 'number', default: 176, min: 66, max: 660, step: 1, suffix: 'lb', width: 'half', visibleWhen: lbUnits },
		{ id: 'hours', label: 'Hours since your first drink', type: 'number', default: 2, min: 0, max: 48, step: 0.25, suffix: 'hours' }
	],
	calculate(v): CalculationResult {
		const count = Number(v.count);
		const hours = Number(v.hours);
		const kg = v.units === 'lb' ? Number(v.lb) * 0.45359237 : Number(v.kg);
		const d = DRINKS[String(v.drink)];
		const perDrink = v.drink === 'custom' ? Number(v.ml) * (Number(v.abv) / 100) * ETHANOL_DENSITY : d?.grams;
		if (!d || !(kg > 0) || ![count, hours, perDrink].every((x) => Number.isFinite(x) && x >= 0)) {
			return { primaryResult: DASH, primaryLabel: 'Estimated BAC', summary: 'Enter your drinks, weight and time.' };
		}
		const grams = count * perDrink;
		const female = v.sex === 'female';
		const bac = widmark(grams, kg, female, hours);
		const toZero = bac / ELIMINATION;
		const level =
			bac === 0
				? 'Estimated to be zero, though alcohol can still affect you.'
				: bac < 0.05
					? 'Below 0.05%, but judgment and reaction time are already affected.'
					: bac < 0.08
						? 'At or above 0.05% — over the driving limit in Scotland, most of Europe, Australia and Utah.'
						: bac < 0.15
							? 'At or above 0.08% — over the driving limit in all US states, England, Wales and Canada (federal).'
							: bac < 0.3
								? 'Very high: serious impairment, vomiting and blackouts are likely.'
								: 'Dangerous: risk of alcohol poisoning. If someone is confused, unresponsive or breathing slowly, call emergency services.';
		const hh = Math.floor(toZero);
		const mm = Math.round((toZero - hh) * 60);
		return {
			primaryResult: `${num(bac, 3, 3)}%`,
			primaryLabel: 'Estimated blood alcohol content',
			summary: level,
			secondaryMetrics: [
				{ label: 'Pure alcohol consumed', value: `${num(grams, 1)} g` },
				{ label: 'Per mille (g/L, used in Europe)', value: `${num(bac * 10, 2, 2)} ‰` },
				{ label: 'Time until about zero', value: bac > 0 ? `${hh} h ${mm} min` : '0 h' },
				{ label: 'Peak BAC (if all drunk at once)', value: `${num(widmark(grams, kg, female, 0), 3, 3)}%` }
			]
		};
	},
	content: {
		intro:
			'Use this BAC calculator to estimate your blood alcohol content from what you drank, your weight, your sex and the time, using the Widmark formula. It is a rough educational estimate, so never use it to decide whether you are safe to drive.',
		howTo: [
			'Pick the drink size your country uses, or enter your own drink size and strength.',
			'Enter how many drinks you had.',
			'Enter your sex and body weight.',
			'Enter the hours since your first drink.'
		],
		about: [
			{
				heading: 'What is blood alcohol content?',
				paragraphs: [
					'Blood alcohol content (BAC) is the share of alcohol in your blood. In the US it is shown as a percentage, so 0.08% means 0.08 g of alcohol in 100 mL of blood. Many countries show it in grams per litre or per mille, where 0.08% equals 0.8 ‰.',
					'BAC depends on how much pure alcohol you drink, your body size and how fast your body clears it. Alcohol also adds calories, about 7 kcal per gram, which you can factor into the [calorie calculator](/calorie-calculator). It is not the same for everyone. Two people who drink the same amount can have very different BAC levels.'
				]
			},
			{
				heading: 'How the Widmark formula works',
				paragraphs: [
					'The Widmark formula divides the grams of pure alcohol you drank by your body weight and a body-water factor. The factor is 0.68 for men and 0.55 for women, because men on average carry more body water. It then subtracts about 0.015% for each hour, which is a common average rate at which the body clears alcohol.',
					'This calculator treats all your drinks as if you had them at the start. It also assumes your body has absorbed the alcohol fully. In real life, alcohol is absorbed over time, and food in your stomach slows this. So the tool gives a simple estimate and not a real reading.'
				]
			},
			{
				heading: 'What is a standard drink?',
				paragraphs: [
					'A standard drink holds a set amount of pure alcohol, but the amount depends on the country. The tool lets you pick yours or enter your own drink size and strength. To change fluid ounces into millilitres, use the [unit converter](/unit-converter).'
				],
				table: {
					caption: 'Pure alcohol in one standard drink',
					columns: ['Country or system', 'Grams of pure alcohol'],
					rows: [
						['United States', '14 g'],
						['Canada', '13.45 g'],
						['Australia, New Zealand, WHO and much of Europe', '10 g'],
						['United Kingdom (one unit)', '8 g']
					]
				}
			},
			{
				heading: 'Driving limits and impairment',
				paragraphs: [
					'Legal limits differ by country. For example, it is 0.08% in every US state except Utah, in England, Wales and Northern Ireland, and under Canada’s Criminal Code. It is 0.05% in Scotland, Utah, most of Europe and Australia. Some countries set a lower limit or allow no alcohol at all.',
					'Alcohol can affect your judgement and reaction time even below the limit. If you have been drinking, do not drive. Plan a lift, a taxi or a sober driver ahead of time.'
				]
			},
			{
				heading: 'Why you cannot speed up sobering up',
				paragraphs: [
					'Only time lowers BAC. Coffee, cold showers and food do not clear alcohol from your blood. Eating before you drink can slow how fast alcohol enters your blood.',
					'Many things change your real BAC, including food, medicines, health, tiredness and how fast you drank. A breath or blood test is the only way to know. Body size matters too, and you can check yours with the [BMI calculator](/bmi-calculator). The NHS and NIAAA also advise limiting how much you drink. If you are worried about your drinking, talk to a doctor.'
				]
			},
			{
				heading: 'When to get emergency help',
				paragraphs: [
					'Very high BAC can cause alcohol poisoning, which is dangerous. Call emergency services if someone is confused, cannot be woken, vomits repeatedly, has seizures, or breathes slowly or unevenly. Do not leave them alone, and keep them on their side.'
				]
			}
		],
		formulas: [
			{
				title: 'Widmark formula',
				expression: 'BAC (%) = A ÷ (r × W) × 100 − β × t',
				variables: [
					{ symbol: 'A', meaning: 'grams of pure alcohol (mL × ABV × 0.789)' },
					{ symbol: 'W', meaning: 'body weight in grams' },
					{ symbol: 'r', meaning: 'body-water factor: 0.68 for men, 0.55 for women' },
					{ symbol: 'β', meaning: 'alcohol removed per hour, about 0.015% BAC' },
					{ symbol: 't', meaning: 'hours since drinking began' }
				]
			}
		],
		example: {
			title: 'An 80 kg man has 4 US standard drinks over 2 hours',
			steps: ['Alcohol: 4 × 14 g = 56 g', 'Peak: 56 ÷ (0.68 × 80,000) × 100 = 0.103%', 'After 2 hours: 0.103% − 0.015% × 2 = 0.073%'],
			result: 'About 0.073% BAC, taking roughly 4 h 52 min more to reach zero.'
		},
		faq: [
			{
				q: 'What is the legal driving limit?',
				a: 'It is 0.08% in every US state except Utah (0.05%), in England, Wales and Northern Ireland, and under Canada’s Criminal Code. It is 0.05% in Scotland, most of Europe and Australia. Many countries set lower limits for new or commercial drivers, and some allow none.'
			},
			{
				q: 'How many drinks does it take to reach 0.08%?',
				a: 'It depends on your weight, sex and time. For an 80 kg man, 3 US standard drinks taken at once give a peak of about 0.077%, and 4 give about 0.103%. Use the calculator to see your own estimate.'
			},
			{
				q: 'How big is a standard drink?',
				a: 'It depends on the country: 14 g of alcohol in the US, 13.45 g in Canada, 10 g in Australia and much of Europe, and 8 g for a UK unit. A 568 mL UK pint of 5% beer has about 2.8 UK units.'
			},
			{
				q: 'Can anything speed up sobering up?',
				a: 'No. Coffee, cold showers and food don’t lower BAC. Only time does. Food eaten before drinking slows how fast alcohol is absorbed.'
			},
			{
				q: 'How accurate is this?',
				a: 'Only roughly. Real BAC varies with body composition, food, medicines, health and how fast you drank. A breathalyser or blood test is the only way to know.'
			}
		],
		sources: [
			{ title: 'NIAAA — What is a standard drink?', url: 'https://www.niaaa.nih.gov/alcohols-effects-health/what-standard-drink' },
			{ title: 'NHS — Calculating alcohol units', url: 'https://www.nhs.uk/live-well/alcohol-advice/calculating-alcohol-units/' }
		],
		disclaimer: 'Never use this to decide whether you can drive. If you have been drinking, don’t drive. The estimate can be far from your real BAC.'
	}
});
