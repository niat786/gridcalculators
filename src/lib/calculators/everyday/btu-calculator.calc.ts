import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './btu-calculator.meta';

/** 1 metre = 3.2808399 feet. */
const FT_PER_M = 3.2808399;
/** 1 BTU/h = 0.29307107 watts. */
const WATTS_PER_BTU_H = 0.29307107;
/** One ton of cooling is 12,000 BTU/h. */
const BTU_H_PER_TON = 12000;
/** Base load: 20 BTU/h for each square foot of a room with an 8 ft ceiling. */
const BTU_PER_SQ_FT = 20;
const REFERENCE_CEILING_FT = 8;
/** Only people beyond this number add load. */
const PEOPLE_INCLUDED = 2;
const BTU_PER_EXTRA_PERSON = 600;

/** Sun exposure as a change to the base load. */
const SUN: Record<string, number> = { shaded: -0.1, normal: 0, sunny: 0.1 };
/** Extra heat from the room type, in BTU/h. */
const ROOM_TYPE_BTU: Record<string, number> = { bedroom: 0, living: 0, kitchen: 4000 };

const isImperial = (v: InputValues) => v.units === 'ft';
const isMetric = (v: InputValues) => v.units === 'm';

const pos = (n: number) => Number.isFinite(n) && n > 0;

function invalid(summary: string): CalculationResult {
	return { primaryResult: DASH, primaryLabel: 'Cooling needed', summary };
}

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'units',
			label: 'Units',
			type: 'select',
			display: 'segmented',
			default: 'ft',
			options: [
				{ label: 'Feet', value: 'ft' },
				{ label: 'Metres', value: 'm' }
			]
		},
		{ id: 'lenFt', label: 'Room length', type: 'number', default: 18, min: 1, max: 500, step: 0.5, suffix: 'ft', width: 'half', visibleWhen: isImperial },
		{ id: 'widFt', label: 'Room width', type: 'number', default: 14, min: 1, max: 500, step: 0.5, suffix: 'ft', width: 'half', visibleWhen: isImperial },
		{ id: 'lenM', label: 'Room length', type: 'number', default: 5.5, min: 0.5, max: 150, step: 0.1, suffix: 'm', width: 'half', visibleWhen: isMetric },
		{ id: 'widM', label: 'Room width', type: 'number', default: 4.3, min: 0.5, max: 150, step: 0.1, suffix: 'm', width: 'half', visibleWhen: isMetric },
		{ id: 'ceilFt', label: 'Ceiling height', type: 'number', default: 8, min: 4, max: 40, step: 0.5, suffix: 'ft', visibleWhen: isImperial },
		{ id: 'ceilM', label: 'Ceiling height', type: 'number', default: 2.5, min: 1.2, max: 12, step: 0.05, suffix: 'm', visibleWhen: isMetric },
		{
			id: 'sun',
			label: 'Sun exposure',
			type: 'select',
			display: 'menu',
			default: 'normal',
			options: [
				{ label: 'Shaded (−10%)', value: 'shaded' },
				{ label: 'Normal (no change)', value: 'normal' },
				{ label: 'Very sunny (+10%)', value: 'sunny' }
			],
			help: 'Pick shaded if the windows face away from the sun most of the day.'
		},
		{
			id: 'people',
			label: 'People in the room',
			type: 'number',
			default: 3,
			min: 0,
			max: 50,
			step: 1,
			decimal: false,
			help: 'Adds 600 BTU/h for each person beyond two.'
		},
		{
			id: 'use',
			label: 'Room type',
			type: 'select',
			display: 'menu',
			default: 'living',
			options: [
				{ label: 'Bedroom', value: 'bedroom' },
				{ label: 'Living room', value: 'living' },
				{ label: 'Kitchen', value: 'kitchen' }
			],
			help: 'A kitchen adds 4,000 BTU/h for heat from cooking appliances.'
		}
	],
	calculate(v): CalculationResult {
		const metric = isMetric(v);
		const len = Number(metric ? v.lenM : v.lenFt);
		const wid = Number(metric ? v.widM : v.widFt);
		const ceiling = Number(metric ? v.ceilM : v.ceilFt);
		const people = Number(v.people);
		const sunKey = String(v.sun);
		const roomKey = String(v.use);

		if (!pos(len) || !pos(wid) || !pos(ceiling)) {
			return invalid('Enter a room length, width and ceiling height greater than zero.');
		}
		if (!Number.isInteger(people) || people < 0) {
			return invalid('Enter the number of people as a whole number, 0 or more.');
		}
		if (!(sunKey in SUN) || !(roomKey in ROOM_TYPE_BTU)) {
			return invalid('Pick a sun exposure and a room type.');
		}

		const lenFt = metric ? len * FT_PER_M : len;
		const widFt = metric ? wid * FT_PER_M : wid;
		const ceilFt = metric ? ceiling * FT_PER_M : ceiling;
		const areaFt2 = lenFt * widFt;

		const base = areaFt2 * BTU_PER_SQ_FT * (ceilFt / REFERENCE_CEILING_FT);
		const sunAdj = base * SUN[sunKey];
		const roomAdd = Math.max(0, people - PEOPLE_INCLUDED) * BTU_PER_EXTRA_PERSON + ROOM_TYPE_BTU[roomKey];
		const total = Math.round(base + sunAdj + roomAdd);

		return {
			primaryResult: `${num(total, 0)} BTU/h`,
			primaryLabel: 'Cooling needed',
			summary: `An estimate for a room of ${num(areaFt2, 0)} sq ft. Treat it as a starting point and check the unit's rating.`,
			secondaryMetrics: [
				{ label: 'Room area', value: `${num(areaFt2, 1)} sq ft` },
				{ label: 'Base load', value: `${num(base, 0)} BTU/h` },
				{ label: 'Sun adjustment', value: `${sunAdj > 0 ? '+' : ''}${num(sunAdj, 0)} BTU/h` },
				{ label: 'People and room type', value: `${num(roomAdd, 0)} BTU/h` },
				{ label: 'Watts', value: `${num(total * WATTS_PER_BTU_H, 0)} W` },
				{ label: 'Tons of cooling', value: `${num(total / BTU_H_PER_TON, 2, 2)} tons` }
			]
		};
	},
	content: {
		intro:
			'Estimate the cooling capacity a room air conditioner needs. The BTU calculator uses the room size, ceiling height, sun, people and room type, and shows the result in BTU per hour, watts and tons.',
		howTo: [
			'Choose feet or metres, then enter the room length and width.',
			'Enter the ceiling height. The standard is 8 feet or about 2.4 metres.',
			'Pick the sun exposure, the number of people and the room type, such as a kitchen.',
			'Read the cooling needed in BTU per hour. Use the watts and tons if your unit is rated differently.'
		],
		about: [
			{
				heading: 'What is a BTU?',
				paragraphs: [
					'A BTU, or British thermal unit, is a measure of heat energy. Cooling capacity is often given as BTU per hour (BTU/h). One BTU per hour is about 0.293 watts, so a 5,000 BTU/h unit removes roughly 1,465 watts of heat.',
					'In the United States and some other markets, air conditioners are sold by BTU/h. Many other countries rate them in watts or kilowatts, so you may need to convert.'
				]
			},
			{
				heading: 'How the BTU estimate is made',
				paragraphs: [
					'This calculator starts with a rule of thumb of 20 BTU per hour for each square foot of floor. It assumes an 8 foot ceiling, and it adjusts for taller or lower rooms in proportion to the ceiling height.',
					'Then it adds or removes load for conditions that change the heat in the room. The [unit converter](/unit-converter) helps if your room is measured in a different unit. Sun, extra people and the heat from a kitchen all push the number up or down.'
				]
			},
			{
				heading: 'Tons of cooling',
				paragraphs: [
					'Air conditioning capacity is also given in tons of refrigeration. One ton is 12,000 BTU per hour, which is about 3.5 kilowatts. This name comes from the old practice of measuring cooling by the amount of ice that would melt in a day.',
					'Large systems for whole buildings use tons. A single room unit is usually rated in BTU/h, and the tons figure in the calculator helps you compare the two.'
				]
			},
			{
				heading: 'What a rule of thumb cannot tell you',
				paragraphs: [
					'This is a quick estimate, not a full heat load calculation. A proper calculation looks at insulation, window area and direction, air leaks, the climate and the equipment in the room. In the United States, engineers often use ACCA Manual J for this.',
					'Humidity matters too, because damp air feels hotter. The [dew point calculator](/dew-point-calculator) and the [heat index calculator](/heat-index-calculator) show how much. and does not cool the room well. Buying too large wastes energy and can leave the room damp, because the unit switches off before it removes moisture.'
				],
				list: [
					'Close blinds and curtains on sunny windows during the day.',
					'Check the energy label, which shows the efficiency of the unit.',
					'Ask a qualified installer to check large or complex spaces.',
					'Keep doors and windows closed while the unit runs.'
				]
			},
			{
				heading: 'Electrical safety for air conditioners',
				paragraphs: [
					'Air conditioners draw a lot of power when they start. Plug them into a suitable outlet, and do not use an extension lead or an overloaded socket. Ask a qualified electrician if you are unsure the circuit can carry the load.',
					'To estimate what the unit will cost to run, use the [electricity calculator](/electricity-calculator). Keep the unit clear of water and check the cable and plug regularly. Installation of fixed units, especially the refrigerant side, should be done by a trained professional.'
				]
			}
		],
		formulas: [
			{
				title: 'Base load',
				expression: 'Base = floor area (sq ft) × 20 × (ceiling height ÷ 8)',
				variables: [
					{ symbol: '20', meaning: 'BTU per hour for each square foot at an 8 foot ceiling' },
					{ symbol: 'ceiling height ÷ 8', meaning: 'the adjustment for a taller or lower ceiling' }
				]
			},
			{
				title: 'Sun, people and room type',
				expression: 'Total = base + sun adjustment + extra people + room type',
				variables: [
					{ symbol: 'sun adjustment', meaning: '−10% for shaded, 0 for normal, +10% for very sunny' },
					{ symbol: 'extra people', meaning: '600 BTU/h for each person beyond two' },
					{ symbol: 'room type', meaning: '4,000 BTU/h for a kitchen, and 0 for a bedroom or living room' }
				]
			},
			{
				title: 'Conversions',
				expression: 'Watts = BTU/h × 0.293\nTons = BTU/h ÷ 12,000',
				variables: [{ symbol: '0.293', meaning: 'watts in one BTU per hour' }]
			}
		],
		example: {
			title: 'An 18 ft by 14 ft living room, 8 ft ceiling, normal sun and 3 people',
			steps: [
				'Area: 18 × 14 = 252 square feet',
				'Base load: 252 × 20 = 5,040 BTU/h',
				'Sun: normal, so no change',
				'People: 3 people, so 1 person above two adds 600 BTU/h',
				'Total: 5,040 + 600 = 5,640 BTU/h, which is about 1,653 watts or 0.47 tons'
			],
			result: 'Look for a unit rated at about 5,640 BTU/h, or the next size up.'
		},
		faq: [
			{
				q: 'How many BTU do I need for a 300 square foot room?',
				a: 'A quick estimate is 20 BTU/h for each square foot, so about 6,000 BTU/h for a standard 8 foot ceiling. Add more for sun, a kitchen or several people, then check the result with the calculator.'
			},
			{
				q: 'Is 12,000 BTU the same as one ton?',
				a: 'Yes. One ton of cooling is 12,000 BTU per hour, about 3.5 kilowatts. Room units are usually sold in BTU/h, so the tons figure is mainly for comparison.'
			},
			{
				q: 'Why does a kitchen need more cooling?',
				a: 'Cooking appliances give off heat, so the room carries more load. The calculator adds 4,000 BTU/h for a kitchen as a rough allowance.'
			},
			{
				q: 'Should I buy a bigger unit to be safe?',
				a: 'Not usually. An oversized unit cycles on and off, cools unevenly and can leave the air damp. A properly sized unit runs longer and removes more moisture.'
			}
		],
		sources: [{ title: 'ENERGY STAR, room air conditioners', url: 'https://www.energystar.gov/' }]
	}
});
