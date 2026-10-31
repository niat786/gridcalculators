import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './gas-mileage-calculator.meta';

const L_PER_GAL = 3.785411784;
const KM_PER_MI = 1.609344;
/** L/100 km = 235.214583 ÷ MPG (the two systems' constants combined). */
const MPG_TO_L100 = 235.214583;

const us = (v: InputValues) => v.units === 'us';
const metric = (v: InputValues) => v.units === 'metric';

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'units',
			label: 'Units',
			type: 'select',
			display: 'segmented',
			default: 'us',
			options: [
				{ label: 'US (miles, gallons)', value: 'us' },
				{ label: 'Metric (km, litres)', value: 'metric' }
			]
		},
		{ id: 'distMi', label: 'Distance driven', type: 'number', default: 350, min: 0.1, max: 1000000, step: 0.1, suffix: 'mi', visibleWhen: us },
		{ id: 'distKm', label: 'Distance driven', type: 'number', default: 560, min: 0.1, max: 1000000, step: 0.1, suffix: 'km', visibleWhen: metric },
		{ id: 'galUs', label: 'Fuel used', type: 'number', default: 12.5, min: 0.01, max: 100000, step: 0.01, suffix: 'gal', visibleWhen: us },
		{ id: 'litres', label: 'Fuel used', type: 'number', default: 47.3, min: 0.01, max: 100000, step: 0.01, suffix: 'L', visibleWhen: metric }
	],
	calculate(v): CalculationResult {
		const isUs = v.units === 'us';
		const dist = Number(isUs ? v.distMi : v.distKm);
		const fuel = Number(isUs ? v.galUs : v.litres);
		if (!Number.isFinite(dist) || dist <= 0 || !Number.isFinite(fuel) || fuel <= 0) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Miles per gallon',
				summary: 'Enter the distance driven and the fuel used.'
			};
		}

		// Convert everything to miles and US gallons first, then derive all three figures.
		const miles = isUs ? dist : dist / KM_PER_MI;
		const gallons = isUs ? fuel : fuel / L_PER_GAL;
		const kilometres = miles * KM_PER_MI;
		const litres = gallons * L_PER_GAL;

		const mpg = miles / gallons;
		const l100 = MPG_TO_L100 / mpg;
		const kmPerL = kilometres / litres;

		return {
			primaryResult: `${num(mpg, 1, 1)} mpg`,
			primaryLabel: 'Miles per gallon (US)',
			summary: `${num(l100, 2, 2)} L per 100 km, or ${num(kmPerL, 2, 2)} km per litre. A lower L/100 km means better economy.`,
			secondaryMetrics: [
				{ label: 'L/100 km', value: `${num(l100, 2, 2)} L/100 km` },
				{ label: 'Kilometres per litre', value: `${num(kmPerL, 2, 2)} km/L` },
				{ label: 'Distance', value: `${num(miles, 1, 1)} mi (${num(kilometres, 1, 1)} km)` },
				{ label: 'Fuel used', value: `${num(gallons, 2, 2)} gal (${num(litres, 2, 2)} L)` }
			]
		};
	},
	content: {
		intro:
			'Work out how far your car travels on a set amount of fuel. Enter the distance and the fuel you used, and see your fuel economy in mpg, L/100 km and km per litre. It works for any petrol or diesel car.',
		howTo: [
			'Choose US or metric units to match the figures you have.',
			'Enter the distance you drove, ideally from one full tank to the next.',
			'Enter the fuel you added in the same period.',
			'Read the fuel economy in all three common formats.'
		],
		about: [
			{
				heading: 'Three ways to write fuel economy',
				paragraphs: [
					'Fuel economy is written in three common ways. In the US, it is miles per gallon (mpg), where higher is better. Much of the world uses litres per 100 kilometres (L/100 km), where lower is better. Some places also use kilometres per litre (km/L), where higher is better.',
					'The three figures describe the same car, so you can convert between them. The table shows how three common figures line up.'
				],
				table: {
					caption: 'The same economy in three formats',
					columns: ['US mpg', 'L/100 km', 'km per litre'],
					rows: [
						['25 mpg', '9.41', '10.63'],
						['28 mpg', '8.40', '11.90'],
						['40 mpg', '5.88', '17.01']
					]
				}
			},
			{
				heading: 'How to measure your own figure',
				paragraphs: [
					'The most reliable method is a full tank to full tank. Fill the tank to the top, and reset your trip meter. Drive as you normally would, then fill up again to the same level. The distance divided by the fuel you added is your economy for that tank.',
					'One tank can be unusual, for example if you drove mostly on motorways or only in town. Averaging several tanks gives a better picture of how your car really performs.'
				]
			},
			{
				heading: 'What changes fuel economy',
				paragraphs: [
					'Speed has a big effect. Air resistance rises faster than speed, so the faster you drive, the more fuel each mile takes.',
					'Fuel use usually rises quickly at high motorway speeds, while steady, moderate speeds use less fuel. Stop-start town driving, idling and short trips with a cold engine also reduce economy.',
					'Other factors matter as well. Extra weight, roof racks, under-inflated tyres and air conditioning can all increase fuel use. Check your tyre pressure regularly, and remove unused roof boxes.'
				]
			},
			{
				heading: 'Comparing cars fairly',
				paragraphs: [
					'Official test figures are measured in set conditions, so your own figure may be lower. Use your own readings to compare your car with a new one, rather than the figure on a brochure. Keep notes on the weather, load and type of driving, so you compare like with like.',
					'Compare cars in the same units. A UK mpg figure uses imperial gallons, so it looks higher than a US mpg figure for the same car. The [unit converter](/unit-converter) helps when the units do not match.'
				]
			},
			{
				heading: 'From economy to cost',
				paragraphs: [
					'Once you know your economy, you can work out what a trip will cost. Enter the same car’s figure into the [fuel cost calculator](/fuel-cost-calculator) with the price of fuel where you live. For the time a trip takes, the [speed calculator](/speed-calculator) works out the average speed.',
					'If you claim mileage for work, the [mileage calculator](/mileage-calculator) works out the reimbursement from your trips.'
				]
			}
		],
		formulas: [
			{
				title: 'Miles per gallon',
				expression: 'MPG = miles driven ÷ US gallons used',
				variables: [{ symbol: 'MPG', meaning: 'Miles per US gallon' }]
			},
			{
				title: 'Litres per 100 km',
				expression: 'L/100 km = 235.214583 ÷ MPG',
				variables: [{ symbol: '235.214583', meaning: 'Constant from 1 US gallon = 3.785411784 L and 1 mile = 1.609344 km' }]
			},
			{
				title: 'Kilometres per litre',
				expression: 'km/L = MPG × 1.609344 ÷ 3.785411784',
				variables: []
			}
		],
		example: {
			title: 'Driving 350 miles on 12.5 US gallons',
			steps: [
				'MPG: 350 ÷ 12.5 = 28.0 mpg',
				'L/100 km: 235.214583 ÷ 28.0 = 8.40 L/100 km',
				'km/L: 28.0 × 1.609344 ÷ 3.785411784 = 11.90 km/L'
			],
			result: 'Fuel economy is 28.0 mpg, 8.40 L/100 km or 11.90 km/L.'
		},
		faq: [
			{
				q: 'How do I measure my fuel economy accurately?',
				a: 'Fill the tank to the top, reset your trip meter, drive normally, then fill up again to the same level. Divide the distance by the fuel added. Repeat over several tanks for an average.'
			},
			{
				q: 'What is the difference between US and UK mpg?',
				a: 'A UK (imperial) gallon is larger than a US gallon, so UK mpg figures are about 20% higher for the same car. This calculator uses US gallons.'
			},
			{
				q: 'Is a lower L/100 km better?',
				a: 'Yes. L/100 km measures the fuel used for a fixed distance, so fewer litres means a more efficient car. Km per litre works the other way: higher is better.'
			},
			{
				q: 'Why is my mpg lower than the figure on the sticker?',
				a: 'Official figures come from set test conditions. Real driving, with traffic, weather and a full load, usually gives a lower figure.'
			},
			{
				q: 'Does air conditioning use more fuel?',
				a: 'Yes. Air conditioning runs on engine power, so it usually adds to fuel use. The effect is often larger at low speeds and in stop-start traffic.'
			}
		],
		sources: [{ title: 'NIST — SI Units and conversion factors (Special Publication 811)', url: 'https://www.nist.gov/pml/special-publication-811' }]
	}
});
