import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './heat-index-calculator.meta';

const isF = (v: InputValues) => v.units === 'f';
const isC = (v: InputValues) => v.units === 'c';

/** The simple NWS formula, used when the result is below 80 °F. t in °F, rh in %. */
export function simpleHeatIndexF(t: number, rh: number): number {
	return 0.5 * (t + 61 + (t - 68) * 1.2 + rh * 0.094);
}

/**
 * NWS heat index in °F (Rothfusz regression with the dry-air and humid-air adjustments).
 * t in °F, rh in %. Returns the value and the method used.
 */
export function heatIndexF(t: number, rh: number): { value: number; method: string } {
	const simple = simpleHeatIndexF(t, rh);
	if ((simple + t) / 2 < 80) return { value: simple, method: 'Simple formula (below 80 °F)' };

	let hi =
		-42.379 +
		2.04901523 * t +
		10.14333127 * rh -
		0.22475541 * t * rh -
		6.83783e-3 * t * t -
		5.481717e-2 * rh * rh +
		1.22874e-3 * t * t * rh +
		8.5282e-4 * t * rh * rh -
		1.99e-6 * t * t * rh * rh;

	if (rh < 13 && t >= 80 && t <= 112) hi -= ((13 - rh) / 4) * Math.sqrt((17 - Math.abs(t - 95)) / 17);
	if (rh > 85 && t >= 80 && t <= 87) hi += ((rh - 85) / 10) * ((87 - t) / 5);

	return { value: hi, method: 'Rothfusz regression with NWS adjustments' };
}

/** NWS caution level from a heat index in °F. */
export function cautionLevel(hiF: number): string {
	if (hiF >= 125) return 'Extreme danger';
	if (hiF >= 103) return 'Danger';
	if (hiF >= 90) return 'Extreme caution';
	if (hiF >= 80) return 'Caution';
	return 'Below NWS caution levels';
}

const ADVICE: Record<string, string> = {
	'Below NWS caution levels': 'The heat index is below 80 °F, so heat is unlikely to add a risk on its own.',
	Caution: 'Fatigue is possible with prolonged exposure or activity.',
	'Extreme caution': 'Heat cramps and heat exhaustion are possible with prolonged exposure or activity.',
	Danger: 'Heat cramps and heat exhaustion are likely. Heat stroke is possible with prolonged exposure or activity.',
	'Extreme danger': 'Heat stroke is highly likely with continued exposure.'
};

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'units',
			label: 'Temperature unit',
			type: 'select',
			display: 'segmented',
			default: 'f',
			options: [
				{ label: 'Fahrenheit (°F)', value: 'f' },
				{ label: 'Celsius (°C)', value: 'c' }
			]
		},
		{ id: 'tempF', label: 'Air temperature', type: 'number', default: 90, min: 40, max: 150, step: 0.1, suffix: '°F', visibleWhen: isF },
		{ id: 'tempC', label: 'Air temperature', type: 'number', default: 32, min: 4, max: 66, step: 0.1, suffix: '°C', visibleWhen: isC },
		{ id: 'rh', label: 'Relative humidity', type: 'number', default: 70, min: 0, max: 100, step: 1, suffix: '%' }
	],
	calculate(v): CalculationResult {
		const fahrenheit = v.units !== 'c';
		const t = Number(fahrenheit ? v.tempF : v.tempC);
		const rh = Number(v.rh);
		if (!Number.isFinite(t) || !(rh >= 0 && rh <= 100)) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Heat index',
				summary: 'Enter a temperature and a relative humidity from 0% to 100%.'
			};
		}
		const tF = fahrenheit ? t : (t * 9) / 5 + 32;
		const tC = fahrenheit ? ((t - 32) * 5) / 9 : t;
		const { value: hiF, method } = heatIndexF(tF, rh);
		const hiC = ((hiF - 32) * 5) / 9;
		const level = cautionLevel(hiF);

		return {
			primaryResult: fahrenheit ? `${num(hiF, 0)} °F` : `${num(hiC, 0)} °C`,
			primaryLabel: 'Heat index (feels like)',
			summary: `${level}. ${ADVICE[level]}`,
			secondaryMetrics: [
				{ label: 'Heat index in °F', value: `${num(hiF, 1, 1)} °F` },
				{ label: 'Heat index in °C', value: `${num(hiC, 1, 1)} °C` },
				{ label: 'Caution level', value: level },
				{ label: 'Air temperature', value: `${num(tF, 1, 1)} °F (${num(tC, 1, 1)} °C)` },
				{ label: 'Method', value: method }
			]
		};
	},
	content: {
		intro:
			'Find the heat index, or how hot the air feels to the body, from air temperature and relative humidity. The heat index calculator uses the NOAA National Weather Service method and shows its caution level.',
		howTo: [
			'Choose Fahrenheit or Celsius, then enter the air temperature in shade.',
			'Enter the relative humidity as a percentage.',
			'Read the heat index, which is the feels-like temperature.',
			'Check the caution level, and follow the advice for that level.'
		],
		about: [
			{
				heading: 'What is the heat index?',
				paragraphs: [
					'The heat index combines air temperature with humidity to show how hot it feels to the body. When air is humid, sweat evaporates more slowly, so the body cools less well. The same air temperature can feel much hotter on a damp day. For example, 90 °F at 70% humidity feels hotter than 90 °F at 30% humidity, because sweat stops evaporating so easily in humid air.',
					'The heat index is also called the apparent temperature or feels-like temperature. It is a guide for shaded, lightly windy conditions, so direct sun and strong wind can change how hot it feels.'
				]
			},
			{
				heading: 'How the heat index is calculated',
				paragraphs: [
					'For a lower temperature, the calculator uses a simple formula. When the result is 80 °F (27 °C) or higher, it uses a longer regression equation, which the National Weather Service uses in its heat index method.',
					'Also, the longer equation includes small corrections for very dry or very humid air in certain temperature ranges. The calculator applies those corrections, so the result matches the NWS method.'
				]
			},
			{
				heading: 'NWS caution levels',
				paragraphs: [
					'The National Weather Service groups heat index values into caution levels. Each level comes with advice on how much care is needed. The levels are the same as those used in NWS heat safety guidance in the United States.',
					'Other countries use different heat warning systems, so check your own national weather service for official alerts. The levels here are a guide to risk, not a replacement for those alerts.'
				],
				table: {
					caption: 'NWS heat index caution levels (heat index in °F)',
					columns: ['Heat index (°F)', 'Level', 'What it means'],
					rows: [
						['80 to 89', 'Caution', 'Fatigue is possible with long exposure or activity'],
						['90 to 102', 'Extreme caution', 'Heat cramps and heat exhaustion are possible'],
						['103 to 124', 'Danger', 'Heat cramps and exhaustion are likely, and heat stroke is possible'],
						['125 and above', 'Extreme danger', 'Heat stroke is highly likely']
					]
				}
			},
			{
				heading: 'Staying safe in the heat',
				paragraphs: [
					'However, heat illness can develop quickly, especially for children, older adults, people who work outdoors and people with some medical conditions. Drink water regularly, rest in shade and take breaks during activity. Also, check on people who live alone.',
					'Heat stroke is a medical emergency. Signs include confusion, a very high body temperature, hot dry or damp skin, and fainting. Call your local emergency number, move the person to a cool place, and cool them while you wait for help.'
				],
				list: [
					'Plan outdoor work for cooler hours of the day.',
					'Wear light, loose clothing, and a hat in the sun.',
					'Never leave a child, pet or older person in a parked car.',
					'Follow official heat alerts from your local weather service.'
				]
			},
			{
				heading: 'Related heat and humidity measures',
				paragraphs: [
					'Dew point is another way to describe humidity, and it is often easier to compare across days. The [dew point calculator](/dew-point-calculator) shows the dew point and a comfort level from the same inputs.',
					'For cooling a room, the [BTU calculator](/btu-calculator) estimates the size of an air conditioner. The [wind chill calculator](/wind-chill-calculator) covers the cold side, where wind makes the air feel colder.'
				]
			}
		],
		formulas: [
			{
				title: 'Simple formula (below 80 °F)',
				expression: 'HI = 0.5 × (T + 61 + (T − 68) × 1.2 + RH × 0.094)',
				variables: [
					{ symbol: 'T', meaning: 'air temperature in °F' },
					{ symbol: 'RH', meaning: 'relative humidity in percent' }
				]
			},
			{
				title: 'Regression formula (80 °F and above)',
				expression: 'HI = −42.379 + 2.04901523 T + 10.14333127 RH − 0.22475541 T RH − 0.00683783 T² − 0.05481717 RH² + 0.00122874 T² RH + 0.00085282 T RH² − 0.00000199 T² RH²',
				variables: [{ symbol: 'HI', meaning: 'heat index in °F, which the calculator converts to °C' }]
			}
		],
		example: {
			title: 'Air at 90 °F with 70% relative humidity',
			steps: [
				'Simple check: the average of 90 and the simple result is still above 80 °F, so the regression formula is used',
				'Regression formula with T = 90 and RH = 70 gives a heat index of 105.9 °F',
				'In Celsius: (105.9 − 32) × 5 ÷ 9 = 41.1 °C',
				'Caution level: 103 to 124 °F is Danger'
			],
			result: 'The heat index is about 106 °F (41 °C), which is in the Danger level.'
		},
		faq: [
			{
				q: 'What is a dangerous heat index?',
				a: 'The NWS calls 103 °F to 124 °F Danger, and 125 °F or above Extreme danger. Heat illness is likely at the Danger level with long exposure, so take extra breaks and water.'
			},
			{
				q: 'Does the heat index apply in the sun?',
				a: 'The NWS heat index is calculated for shade. Direct sun can make it feel hotter, so take extra care in full sun.'
			},
			{
				q: 'Why is the heat index higher than the air temperature?',
				a: 'It is a feels-like temperature, which includes humidity. On a humid day, the heat index is higher than the air temperature.'
			},
			{
				q: 'Is the heat index the same in every country?',
				a: 'The formula is the NOAA National Weather Service method, and many countries use their own heat warnings. Use your national weather service for official alerts.'
			}
		],
		sources: [
			{ title: 'NOAA National Weather Service, heat safety and the heat index', url: 'https://www.weather.gov/safety/heat-index' },
			{ title: 'NOAA National Weather Service', url: 'https://www.weather.gov/' }
		],
		disclaimer:
			'The heat index is a guide to heat stress, not a medical measure. Get medical help if someone shows signs of heat illness.'
	}
});
