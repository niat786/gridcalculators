import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, money, num } from '../format';
import meta from './fuel-cost-calculator.meta';

const L_PER_GAL = 3.785411784;
const KM_PER_MI = 1.609344;

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
				{ label: 'US (miles, mpg, $/gal)', value: 'us' },
				{ label: 'Metric (km, L/100 km, price/L)', value: 'metric' }
			]
		},
		{ id: 'distUs', label: 'Trip distance', type: 'number', default: 250, min: 0.1, max: 1000000, step: 1, suffix: 'mi', visibleWhen: us },
		{ id: 'distKm', label: 'Trip distance', type: 'number', default: 400, min: 0.1, max: 1000000, step: 1, suffix: 'km', visibleWhen: metric },
		{ id: 'mpg', label: 'Fuel efficiency', type: 'number', default: 28, min: 1, max: 200, step: 0.1, suffix: 'mpg', visibleWhen: us },
		{ id: 'l100', label: 'Fuel efficiency', type: 'number', default: 6.5, min: 0.5, max: 100, step: 0.1, suffix: 'L/100 km', visibleWhen: metric },
		{ id: 'priceGal', label: 'Fuel price', type: 'number', default: 3.45, min: 0, max: 1000, step: 0.01, prefix: '$', suffix: '/gal', visibleWhen: us },
		{ id: 'priceL', label: 'Fuel price', type: 'number', default: 1.8, min: 0, max: 1000, step: 0.01, prefix: '$', suffix: '/L', visibleWhen: metric },
		{
			id: 'roundTrip',
			label: 'Round trip',
			type: 'toggle',
			default: false,
			help: 'Doubles the distance for the return journey.'
		}
	],
	calculate(v): CalculationResult {
		const isUs = v.units === 'us';
		const dist = Number(isUs ? v.distUs : v.distKm);
		const eff = Number(isUs ? v.mpg : v.l100);
		const price = Number(isUs ? v.priceGal : v.priceL);
		if (!Number.isFinite(dist) || dist <= 0 || !Number.isFinite(eff) || eff <= 0 || !Number.isFinite(price) || price < 0) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Trip fuel cost',
				summary: 'Enter a trip distance, fuel efficiency and fuel price.'
			};
		}

		const total = dist * (v.roundTrip ? 2 : 1);
		// Work out fuel in both systems so both are always shown.
		const gallons = isUs ? total / eff : total * eff / 100 / L_PER_GAL;
		const litres = isUs ? gallons * L_PER_GAL : total * eff / 100;
		const cost = (isUs ? gallons : litres) * price;

		const distanceText = isUs
			? `${num(total, 1, 0)} mi (${num(total * KM_PER_MI, 1, 0)} km)`
			: `${num(total, 1, 0)} km (${num(total / KM_PER_MI, 1, 0)} mi)`;
		const fuelText = isUs
			? `${num(gallons, 2, 2)} gal (${num(litres, 2, 2)} L)`
			: `${num(litres, 2, 2)} L (${num(gallons, 2, 2)} gal)`;

		return {
			primaryResult: money(cost),
			primaryLabel: 'Trip fuel cost',
			summary: isUs
				? `About ${num(gallons, 2, 2)} gallons of fuel for ${num(total, 1, 0)} miles.`
				: `About ${num(litres, 2, 2)} litres of fuel for ${num(total, 1, 0)} kilometres.`,
			secondaryMetrics: [
				{ label: 'Fuel needed', value: fuelText },
				{ label: 'Total distance', value: distanceText },
				{ label: isUs ? 'Cost per 100 miles' : 'Cost per 100 km', value: money((cost / total) * 100) }
			]
		};
	},
	content: {
		intro:
			'Estimate how much fuel a trip will use and what it will cost, using your distance, your vehicle’s fuel efficiency and the local price of fuel. Choose US or metric units to match your car and your petrol or diesel price.',
		howTo: [
			'Choose US or metric units to match your car and your fuel price.',
			'Enter the trip distance and turn on round trip if you will return.',
			'Enter your fuel efficiency. Use your car’s average figure for the best estimate.',
			'Enter the fuel price per gallon or per litre and read the trip cost.'
		],
		about: [
			{
				heading: 'How fuel efficiency is measured',
				paragraphs: [
					'In the US, fuel efficiency is written as miles per gallon (mpg), so a higher number is better. Most of the rest of the world uses litres per 100 kilometres (L/100 km), so a lower number is better.',
					'To convert L/100 km to US mpg, divide 235.2 by the L/100 km figure. For example, 6.5 L/100 km is about 36 mpg. The [unit converter](/unit-converter) can also change distances and volumes if you need them separately.'
				]
			},
			{
				heading: 'Why UK and US mpg figures differ',
				paragraphs: [
					'The UK measures mpg in imperial gallons. An imperial gallon is about 4.546 litres, while a US gallon is about 3.785 litres. Because the imperial gallon is bigger, the same car shows a higher mpg in the UK.',
					'As a result, a car rated at 40 mpg in the UK is about 33 mpg in US terms. Always check which gallon a figure uses before you compare it with another.'
				]
			},
			{
				heading: 'Fuel price per litre and per gallon',
				paragraphs: [
					'Fuel prices are shown per litre in most countries and per gallon in the US. One US gallon is 3.785 litres, so a price of $3.45 per gallon is about $0.91 per litre.',
					'Check the currency and the unit on the pump or the local news before you enter a price. A small mistake in the price can change a trip cost a lot.'
				]
			},
			{
				heading: 'What changes your real fuel use',
				paragraphs: [
					'Fuel use rises at high speed, in heavy traffic, with a full load and in cold or windy weather. Air conditioning and short trips also use more fuel than long steady drives.',
					'Tyre pressure matters too. Under-inflated tyres add resistance, so check them regularly. For a trip at a steady speed, the [speed calculator](/speed-calculator) helps you plan the time.'
				]
			},
			{
				heading: 'Sharing the cost of a trip',
				paragraphs: [
					'For a shared journey, divide the total fuel cost by the number of people in the car. A driver may also want to add wear, tolls and parking. Agree on the split before the trip, so there are no surprises.',
					'For a bigger picture of household spending, the [budget calculator](/budget-calculator) helps you plan regular costs such as travel. The [mileage calculator](/mileage-calculator) can help you track the distances you drive.'
				]
			},
			{
				heading: 'Vehicles this tool does not cover',
				paragraphs: [
					'This calculator is for petrol, diesel and similar fuel-burning vehicles. It does not cover electric cars, which use electricity rather than fuel, or hybrids that run on both. For a full comparison of running costs, the [gas mileage calculator](/gas-mileage-calculator) can help you check your own figures.'
				]
			}
		],
		formulas: [
			{
				title: 'US units',
				expression: 'Fuel needed (gal) = distance (mi) ÷ fuel efficiency (mpg)\nCost = fuel needed × price per gallon',
				variables: [
					{ symbol: 'mpg', meaning: 'Miles per US gallon' },
					{ symbol: 'distance', meaning: 'Total distance, doubled for a round trip' }
				]
			},
			{
				title: 'Metric units',
				expression: 'Fuel needed (L) = distance (km) × L/100 km ÷ 100\nCost = fuel needed × price per litre',
				variables: [{ symbol: 'L/100 km', meaning: 'Litres of fuel used per 100 kilometres' }]
			}
		],
		example: {
			title: 'A 250 mile round trip at 28 mpg with fuel at $3.45 per gallon',
			steps: [
				'Total distance: 250 × 2 = 500 miles',
				'Fuel needed: 500 ÷ 28 = 17.86 gallons',
				'Cost: 17.857 × $3.45 = $61.61'
			],
			result: 'The trip uses about 17.86 gallons and costs about $61.61 in fuel.'
		},
		faq: [
			{
				q: 'Where do I find my fuel efficiency?',
				a: 'Most cars show an average figure on the trip computer or in the fuel economy label. A figure from a recent tank of fuel, worked out as miles driven divided by gallons added, is often more accurate.'
			},
			{
				q: 'Does this include tolls, wear or parking?',
				a: 'No. It covers fuel only. Add tolls, parking and other running costs yourself if you want a full trip budget.'
			},
			{
				q: 'Why does the fuel use change with speed?',
				a: 'Fuel efficiency falls at high speed, in heavy traffic, with a full load and in cold weather. Use a figure that matches your usual driving for a closer estimate.'
			},
			{
				q: 'How do I convert L/100 km to mpg?',
				a: 'Divide 235.2 by the L/100 km figure to get US mpg. For example, 8 L/100 km is about 29 mpg. Higher mpg and lower L/100 km both mean better fuel use.'
			},
			{
				q: 'How do I split the fuel cost between passengers?',
				a: 'Divide the total fuel cost by the number of people sharing the car. For a round trip for four people, that is the total cost divided by four.'
			}
		],
		sources: [{ title: 'NIST — SI Units and conversion factors (Special Publication 811)', url: 'https://www.nist.gov/pml/special-publication-811' }]
	}
});
