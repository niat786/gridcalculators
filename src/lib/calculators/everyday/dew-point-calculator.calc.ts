import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num, pct } from '../format';
import meta from './dew-point-calculator.meta';

const fahrenheit = (v: InputValues) => v.units === 'f';
const celsius = (v: InputValues) => v.units === 'c';

/** Magnus coefficients from Alduchov and Eskridge (1996). */
const A = 17.625;
const B = 243.04; // °C

/** Dew point in °C from air temperature in °C and relative humidity in percent. */
export function dewPointC(tC: number, rh: number): number {
	const gamma = Math.log(rh / 100) + (A * tC) / (B + tC);
	return (B * gamma) / (A - gamma);
}

/** Comfort band from a dew point in °F, following a general National Weather Service guideline. */
export function comfortBand(tdF: number): string {
	if (tdF < 55) return 'Dry';
	if (tdF < 65) return 'Comfortable';
	if (tdF <= 70) return 'Humid';
	return 'Oppressive';
}

const BAND_TEXT: Record<string, string> = {
	Dry: 'Dry air. Skin and airways may feel dry.',
	Comfortable: 'Comfortable for most people.',
	Humid: 'Humid. Stickiness is noticeable.',
	Oppressive: 'Oppressive. Muggy and uncomfortable for most people.'
};

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'units',
			label: 'Temperature unit',
			type: 'select',
			display: 'segmented',
			default: 'c',
			options: [
				{ label: 'Celsius (°C)', value: 'c' },
				{ label: 'Fahrenheit (°F)', value: 'f' }
			]
		},
		{ id: 'tempC', label: 'Air temperature', type: 'number', default: 25, min: -60, max: 60, step: 0.1, suffix: '°C', visibleWhen: celsius },
		{ id: 'tempF', label: 'Air temperature', type: 'number', default: 77, min: -76, max: 140, step: 0.1, suffix: '°F', visibleWhen: fahrenheit },
		{ id: 'rh', label: 'Relative humidity', type: 'number', default: 60, min: 0, max: 100, step: 1, suffix: '%' }
	],
	calculate(v): CalculationResult {
		const isF = fahrenheit(v);
		const t = Number(isF ? v.tempF : v.tempC);
		const rh = Number(v.rh);
		if (!Number.isFinite(t) || !(rh > 0 && rh <= 100)) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Dew point',
				summary: 'Enter a temperature and a relative humidity above 0% and up to 100%.'
			};
		}
		const tC = isF ? ((t - 32) * 5) / 9 : t;
		const tdC = dewPointC(tC, rh);
		const tdF = (tdC * 9) / 5 + 32;
		const band = comfortBand(tdF);
		const unit = isF ? '°F' : '°C';
		const primary = isF ? `${num(tdF, 1, 1)} °F` : `${num(tdC, 1, 1)} °C`;
		const otherDew = isF ? `${num(tdC, 1, 1)} °C` : `${num(tdF, 1, 1)} °F`;
		const gap = isF ? (tC - tdC) * 1.8 : tC - tdC;

		return {
			primaryResult: primary,
			primaryLabel: 'Dew point',
			summary: BAND_TEXT[band],
			secondaryMetrics: [
				{ label: isF ? 'Dew point in °C' : 'Dew point in °F', value: otherDew },
				{ label: 'Comfort level', value: band },
				{ label: 'Air temperature', value: `${num(t, 1, 1)} ${unit}` },
				{ label: 'Air minus dew point', value: `${num(gap, 1, 1)} ${unit}` },
				{ label: 'Relative humidity', value: pct(rh, 1) }
			]
		};
	},
	content: {
		intro:
			'Find the dew point from the air temperature and relative humidity. The dew point calculator shows the temperature at which air becomes saturated, and gives a comfort level in Celsius or Fahrenheit.',
		howTo: [
			'Choose Celsius or Fahrenheit, then enter the air temperature.',
			'Enter the relative humidity as a percentage, from above 0% up to 100%.',
			'Read the dew point, which is the temperature the air must cool to before water condenses.',
			'Check the comfort level and the gap between the air and dew point temperatures.'
		],
		about: [
			{
				heading: 'What is the dew point?',
				paragraphs: [
					'The dew point is the temperature at which the air becomes fully saturated with water vapour. If the air cools to that point, water condenses as dew, fog or condensation on cold surfaces.',
					'However, unlike relative humidity, the dew point does not change with the air temperature alone. It tells you how much moisture is actually in the air, which is why meteorologists and farmers often prefer it.'
				]
			},
			{
				heading: 'How the dew point is calculated',
				paragraphs: [
					'This calculator uses the Magnus formula, with coefficients published by Alduchov and Eskridge in 1996. It takes the air temperature and the relative humidity, and works out the temperature at which the air would be saturated.',
					'Also, the formula works well across the normal range of weather. It is not designed for extreme cold or for very precise laboratory work, where a dew point meter or a psychrometric chart is more suitable.'
				]
			},
			{
				heading: 'How to read the comfort level',
				paragraphs: [
					'For example, dew point is a good guide to how humid the air feels. The bands used here are a general guideline, not an official standard. Weather services use similar ranges to describe how muggy it feels.',
					'A dew point below about 55 °F (13 °C) feels dry. Between 55 and 65 °F (13 to 18 °C) feels comfortable for most people. Above 65 °F (18 °C) the air feels increasingly sticky, and above 70 °F (21 °C) it can feel oppressive.'
				],
				table: {
					caption: 'Comfort levels by dew point (general guideline)',
					columns: ['Dew point (°F)', 'Dew point (°C)', 'Feel'],
					rows: [
						['Below 55', 'Below 13', 'Dry'],
						['55 to 65', '13 to 18', 'Comfortable'],
						['65 to 70', '18 to 21', 'Humid'],
						['Above 70', 'Above 21', 'Oppressive']
					]
				}
			},
			{
				heading: 'Dew point and heat or cold',
				paragraphs: [
					'High dew points make heat harder to bear, because sweat cools the body less well in damp air. For a fuller picture of how humidity affects how hot it feels, see the [heat index calculator](/heat-index-calculator).',
					'In cold weather, the dew point matters for frost and fog. The [wind chill calculator](/wind-chill-calculator) covers the other side, how wind makes cold air feel colder.'
				]
			},
			{
				heading: 'Dew point and condensation at home',
				paragraphs: [
					'For example, condensation forms on any surface that is colder than the dew point of the air touching it. This is why windows steam up in winter, and why damp patches can form on cold walls. Mould grows in these damp conditions.',
					'So keep indoor humidity under control with ventilation, heating and dehumidifiers where needed. The [btu calculator](/btu-calculator) covers room cooling, which also affects humidity.'
				],
				list: [
					'Ventilate kitchens and bathrooms when cooking or showering.',
					'Keep wardrobes and corners a little warm to reduce cold spots.',
					'Use an extractor fan in a damp room, and let it run for a while after use.',
					'Check for damp or mould, and get professional advice if it returns.'
				]
			},
			{
				heading: 'Safety in hot and cold weather',
				paragraphs: [
					'Dew point and humidity are useful signs of heat stress. On very humid days, rest in shade, drink water regularly and watch for signs of heat illness. Heat stroke is a medical emergency.',
					'Also, check official forecasts from your national weather service. The NOAA National Weather Service in the United States, and the national meteorological services in other countries, publish warnings for heat and cold.'
				]
			}
		],
		formulas: [
			{
				title: 'Magnus formula',
				expression: 'γ = ln(RH ÷ 100) + (17.625 × T) ÷ (243.04 + T)\nDew point = 243.04 × γ ÷ (17.625 − γ)',
				variables: [
					{ symbol: 'T', meaning: 'air temperature in °C' },
					{ symbol: 'RH', meaning: 'relative humidity in percent' },
					{ symbol: 'ln', meaning: 'the natural logarithm' }
				]
			},
			{
				title: 'Converting between units',
				expression: '°F = °C × 9 ÷ 5 + 32\n°C = (°F − 32) × 5 ÷ 9',
				variables: [{ symbol: '°F', meaning: 'degrees Fahrenheit' }]
			}
		],
		example: {
			title: 'Air at 25 °C with 60% relative humidity',
			steps: [
				'Work out γ: ln(0.60) + (17.625 × 25) ÷ (243.04 + 25) = −0.5108 + 1.6436 = 1.1328',
				'Dew point: 243.04 × 1.1328 ÷ (17.625 − 1.1328) = 16.7 °C',
				'In Fahrenheit: 16.7 × 9 ÷ 5 + 32 = 62.1 °F',
				'Air minus dew point: 25 − 16.7 = 8.3 °C'
			],
			result: 'The dew point is 16.7 °C (62.1 °F), which is a comfortable level for most people.'
		},
		faq: [
			{
				q: 'What is a good dew point?',
				a: 'Most people feel comfortable with a dew point around 55 to 65 °F (13 to 18 °C). Above 70 °F (21 °C), the air feels oppressive for many people. The right level depends on your body and your activity.'
			},
			{
				q: 'What is the difference between dew point and humidity?',
				a: 'Relative humidity is the percentage of moisture the air holds compared with its maximum, and it changes with temperature. Dew point is the actual temperature at which that moisture would condense, so it is a clearer measure of how humid the air is.'
			},
			{
				q: 'Can the dew point be higher than the air temperature?',
				a: 'No. At 100% humidity, the dew point equals the air temperature. The calculator needs a humidity above zero, and it will show a dew point at or below the air temperature.'
			},
			{
				q: 'Why do my windows steam up?',
				a: 'The glass is colder than the dew point of the room air, so water condenses on it. More ventilation or heating usually reduces the problem.'
			}
		],
		sources: [{ title: 'NOAA National Weather Service', url: 'https://www.weather.gov/' }]
	}
});
