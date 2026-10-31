import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './wind-chill-calculator.meta';

const metric = (v: InputValues) => v.units === 'met';
const imperial = (v: InputValues) => v.units !== 'met';

/** NWS / Environment Canada wind chill (2001), in °F with wind in mph. */
export function windChillF(tF: number, mph: number): number {
	const w = Math.pow(mph, 0.16);
	return 35.74 + 0.6215 * tF - 35.75 * w + 0.4275 * tF * w;
}

/** NWS / Environment Canada wind chill (2001), in °C with wind in km/h. */
export function windChillC(tC: number, kmh: number): number {
	const w = Math.pow(kmh, 0.16);
	return 13.12 + 0.6215 * tC - 11.37 * w + 0.3965 * tC * w;
}

/**
 * Approximate frostbite time from the NWS wind chill chart bands, with wind chill in °F.
 * Bands: 30 minutes from −18 °F down to −34 °F, 10 minutes from −35 °F to −49 °F, 5 minutes at −50 °F and below.
 */
export function frostbiteTime(wcF: number): string | null {
	if (wcF > -18) return null;
	if (wcF > -35) return 'About 30 minutes';
	if (wcF > -50) return 'About 10 minutes';
	return 'About 5 minutes';
}

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'units',
			label: 'Units',
			type: 'select',
			display: 'segmented',
			default: 'imp',
			options: [
				{ label: 'Imperial (°F, mph)', value: 'imp' },
				{ label: 'Metric (°C, km/h)', value: 'met' }
			]
		},
		{ id: 'tempF', label: 'Air temperature', type: 'number', default: 0, min: -100, max: 100, step: 0.1, suffix: '°F', visibleWhen: imperial },
		{ id: 'windMph', label: 'Wind speed', type: 'number', default: 15, min: 0, max: 200, step: 0.1, suffix: 'mph', visibleWhen: imperial },
		{ id: 'tempC', label: 'Air temperature', type: 'number', default: -18, min: -73, max: 40, step: 0.1, suffix: '°C', visibleWhen: metric },
		{ id: 'windKmh', label: 'Wind speed', type: 'number', default: 24, min: 0, max: 320, step: 0.1, suffix: 'km/h', visibleWhen: metric }
	],
	calculate(v): CalculationResult {
		const isMetric = metric(v);
		const t = Number(isMetric ? v.tempC : v.tempF);
		const w = Number(isMetric ? v.windKmh : v.windMph);
		if (!Number.isFinite(t) || !Number.isFinite(w) || w < 0) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Wind chill',
				summary: 'Enter an air temperature and a wind speed of zero or more.'
			};
		}
		const unit = isMetric ? '°C' : '°F';
		const speedUnit = isMetric ? 'km/h' : 'mph';
		const tF = isMetric ? t * 1.8 + 32 : t;
		const tC = isMetric ? t : ((t - 32) * 5) / 9;

		const applies = isMetric ? t <= 10 && w >= 4.8 : t <= 50 && w >= 3;
		if (!applies) {
			return {
				primaryResult: `${num(t, 0)} ${unit}`,
				primaryLabel: 'Air temperature (no wind chill)',
				summary:
					'The wind chill formula does not apply here. It is used only at 50 °F (10 °C) or colder, with wind above 3 mph (4.8 km/h), so the air temperature is shown.',
				secondaryMetrics: [
					{ label: 'Wind chill', value: 'Not applicable' },
					{ label: 'Wind speed', value: `${num(w, 1, 1)} ${speedUnit}` },
					{ label: 'Frostbite time', value: 'Not applicable' }
				]
			};
		}

		const wc = isMetric ? windChillC(t, w) : windChillF(t, w);
		const wcF = isMetric ? wc * 1.8 + 32 : wc;
		const wcC = isMetric ? wc : ((wc - 32) * 5) / 9;
		const frost = frostbiteTime(wcF);

		return {
			primaryResult: `${num(isMetric ? wcC : wcF, 0)} ${unit}`,
			primaryLabel: 'Wind chill (feels like)',
			summary: frost
				? `Exposed skin can freeze in ${frost.toLowerCase()}.`
				: 'Above −18 °F, the NWS chart lists no frostbite time, but cold still matters for long exposure.',
			secondaryMetrics: [
				{ label: isMetric ? 'Wind chill in °F' : 'Wind chill in °C', value: isMetric ? `${num(wcF, 1, 1)} °F` : `${num(wcC, 1, 1)} °C` },
				{ label: 'Air temperature', value: `${num(t, 1, 1)} ${unit}` },
				{ label: 'Wind speed', value: `${num(w, 1, 1)} ${speedUnit}` },
				{ label: 'Frostbite time (approx.)', value: frost ?? 'Not listed above −18 °F' }
			]
		};
	},
	content: {
		intro:
			'Find the wind chill, or how cold the air feels on exposed skin, from air temperature and wind speed. The wind chill calculator uses the NOAA National Weather Service formula and gives an approximate frostbite time.',
		howTo: [
			'Choose Fahrenheit and mph, or Celsius and km/h, to match your forecast.',
			'Enter the air temperature and the wind speed.',
			'Read the wind chill, which is the feels-like temperature on exposed skin.',
			'Check the frostbite time, and cover up when it is short.'
		],
		about: [
			{
				heading: 'What is wind chill?',
				paragraphs: [
					'Wind chill describes how cold the air feels on exposed skin, because wind takes heat away from the body faster. It does not change the air temperature, and it does not affect objects that are not warm, such as a car or a stone.',
					'Wind chill is only meaningful when the air is cold and the wind is noticeable. In warm weather, a breeze is more useful for cooling than for changing a feels-like figure.'
				]
			},
			{
				heading: 'When the wind chill formula applies',
				paragraphs: [
					'The National Weather Service uses wind chill only when the air is 50 °F (10 °C) or colder, and the wind is above 3 mph (4.8 km/h). Outside those limits, the calculator shows the air temperature instead, because the formula does not apply.',
					'The formula was updated in 2001 by the NWS and Environment and Climate Change Canada. It uses air temperature in °F and wind speed in mph, with the same method applied in metric units.'
				]
			},
			{
				heading: 'Frostbite and wind chill',
				paragraphs: [
					'Frostbite is the freezing of skin and the tissue below it. Exposed fingers, toes, ears, nose and cheeks are most at risk. The lower the wind chill, the less time it takes for frostbite to start.',
					'The calculator shows an approximate time, based on simplified bands taken from the NWS chart. The real time depends on the person, their clothing and how wet they are. Use the NWS chart for the official bands.'
				],
				table: {
					caption: 'Simplified frostbite bands used in this calculator (wind chill in °F)',
					columns: ['Wind chill (°F)', 'Approximate time to frostbite'],
					rows: [
						['Above −18', 'No time listed'],
						['−18 to −34', 'About 30 minutes'],
						['−35 to −49', 'About 10 minutes'],
						['−50 and below', 'About 5 minutes']
					]
				}
			},
			{
				heading: 'Staying warm and safe in the cold',
				paragraphs: [
					'Dress in layers, cover your head and face, and keep dry. Wet clothing loses heat much faster than dry clothing. Limit time outdoors when the wind chill is low, and take breaks in a warm place.',
					'Frostbite and hypothermia need medical help. If skin looks white, grey or waxy, or feels numb, get to a warm place and call for help. Do not rub the area, and do not warm it with direct heat. Hypothermia can cause shivering, confusion and drowsiness, and it is an emergency.'
				],
				list: [
					'Wear a hat, scarf and gloves, and cover exposed skin in strong wind.',
					'Use warm drinks, and avoid alcohol before going out in the cold.',
					'Check on older people and anyone who works outdoors.',
					'Follow official cold weather alerts from your national weather service.'
				]
			},
			{
				heading: 'Related weather measures',
				paragraphs: [
					'The [heat index calculator](/heat-index-calculator) covers the hot side of the feels-like scale, where humidity and air temperature matter most. The [dew point calculator](/dew-point-calculator) shows the moisture in the air, which affects how cold damp weather feels.',
					'If you need to convert wind speeds or temperatures between units, the [unit converter](/unit-converter) helps.'
				]
			}
		],
		formulas: [
			{
				title: 'Wind chill in °F (NWS, 2001)',
				expression: 'WC = 35.74 + 0.6215 T − 35.75 V^0.16 + 0.4275 T V^0.16',
				variables: [
					{ symbol: 'T', meaning: 'air temperature in °F' },
					{ symbol: 'V', meaning: 'wind speed in mph' }
				]
			},
			{
				title: 'Wind chill in °C',
				expression: 'WC = 13.12 + 0.6215 T − 11.37 V^0.16 + 0.3965 T V^0.16',
				variables: [
					{ symbol: 'T', meaning: 'air temperature in °C' },
					{ symbol: 'V', meaning: 'wind speed in km/h' }
				]
			}
		],
		example: {
			title: 'Air at 0 °F with a 15 mph wind',
			steps: [
				'Wind factor: 15^0.16 = 1.542',
				'Terms: 35.74 + 0.6215 × 0 − 35.75 × 1.542 + 0.4275 × 0 × 1.542',
				'Wind chill: 35.74 − 55.12 = −19.4 °F, shown as −19 °F',
				'The temperature is below −18 °F, so the bands suggest frostbite may start in about 30 minutes'
			],
			result: 'The wind chill is about −19 °F (−28.6 °C), and exposed skin can freeze in roughly 30 minutes.'
		},
		faq: [
			{
				q: 'What is a dangerous wind chill?',
				a: 'There is no single number, but wind chill of −18 °F (−28 °C) or colder can cause frostbite in about 30 minutes on exposed skin. Lower values are more dangerous, and the time shortens.'
			},
			{
				q: 'Does wind chill affect objects or pets?',
				a: 'Wind chill describes people, and it is most useful for exposed skin. Pets and objects cool to the air temperature, though animals can also be harmed by long exposure in cold, wet or windy weather.'
			},
			{
				q: 'Why does the calculator show the air temperature sometimes?',
				a: 'The wind chill formula only applies at 50 °F (10 °C) or colder, with wind above 3 mph (4.8 km/h). Outside those limits, the air temperature is the best guide.'
			},
			{
				q: 'Is the wind chill the same in every country?',
				a: 'The formula is the same method used by the NWS and Environment and Climate Change Canada. Other countries may use different feels-like scales, so check your national weather service.'
			}
		],
		sources: [
			{ title: 'NOAA National Weather Service, cold and wind chill chart', url: 'https://www.weather.gov/safety/cold-wind-chill-chart' },
			{ title: 'NOAA National Weather Service', url: 'https://www.weather.gov/' }
		],
		disclaimer:
			'Wind chill is a guide to cold stress, and the frostbite times are approximate. Get medical help if you see signs of frostbite or hypothermia.'
	}
});
