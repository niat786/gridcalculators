import { defineCalculator, type CalculationResult, type CalculatorInput, type InputValues } from '../types';
import { DASH } from '../format';
import meta from './unit-converter.meta';

/** Linear units: value in the category's base unit = value × factor. Factors are exact definitions where one exists. */
type Unit = { id: string; label: string; symbol: string; factor: number };

const IN = 0.0254;
const FT = 0.3048;
const LB = 0.45359237;
const GAL = 3.785411784e-3; // US gallon in m³

export const CATEGORIES: Record<string, { label: string; units: Unit[]; from: string; to: string }> = {
	length: {
		label: 'Length',
		from: 'cm',
		to: 'in',
		units: [
			{ id: 'mm', label: 'Millimetres', symbol: 'mm', factor: 0.001 },
			{ id: 'cm', label: 'Centimetres', symbol: 'cm', factor: 0.01 },
			{ id: 'm', label: 'Metres', symbol: 'm', factor: 1 },
			{ id: 'km', label: 'Kilometres', symbol: 'km', factor: 1000 },
			{ id: 'in', label: 'Inches', symbol: 'in', factor: IN },
			{ id: 'ft', label: 'Feet', symbol: 'ft', factor: FT },
			{ id: 'yd', label: 'Yards', symbol: 'yd', factor: 0.9144 },
			{ id: 'mi', label: 'Miles', symbol: 'mi', factor: 1609.344 },
			{ id: 'nmi', label: 'Nautical miles', symbol: 'nmi', factor: 1852 }
		]
	},
	mass: {
		label: 'Weight and mass',
		from: 'kg',
		to: 'lb',
		units: [
			{ id: 'mg', label: 'Milligrams', symbol: 'mg', factor: 1e-6 },
			{ id: 'g', label: 'Grams', symbol: 'g', factor: 0.001 },
			{ id: 'kg', label: 'Kilograms', symbol: 'kg', factor: 1 },
			{ id: 't', label: 'Metric tonnes', symbol: 't', factor: 1000 },
			{ id: 'oz', label: 'Ounces', symbol: 'oz', factor: LB / 16 },
			{ id: 'lb', label: 'Pounds', symbol: 'lb', factor: LB },
			{ id: 'st', label: 'Stone', symbol: 'st', factor: LB * 14 },
			{ id: 'ton', label: 'US tons', symbol: 'ton', factor: LB * 2000 }
		]
	},
	volume: {
		label: 'Volume',
		from: 'l',
		to: 'gal',
		units: [
			{ id: 'ml', label: 'Millilitres', symbol: 'mL', factor: 1e-6 },
			{ id: 'l', label: 'Litres', symbol: 'L', factor: 1e-3 },
			{ id: 'm3', label: 'Cubic metres', symbol: 'm³', factor: 1 },
			{ id: 'tsp', label: 'US teaspoons', symbol: 'tsp', factor: GAL / 768 },
			{ id: 'tbsp', label: 'US tablespoons', symbol: 'tbsp', factor: GAL / 256 },
			{ id: 'floz', label: 'US fluid ounces', symbol: 'fl oz', factor: GAL / 128 },
			{ id: 'cup', label: 'US cups', symbol: 'cup', factor: GAL / 16 },
			{ id: 'pt', label: 'US pints', symbol: 'pt', factor: GAL / 8 },
			{ id: 'qt', label: 'US quarts', symbol: 'qt', factor: GAL / 4 },
			{ id: 'gal', label: 'US gallons', symbol: 'gal', factor: GAL },
			{ id: 'ukgal', label: 'Imperial gallons', symbol: 'imp gal', factor: 4.54609e-3 },
			{ id: 'ft3', label: 'Cubic feet', symbol: 'ft³', factor: FT ** 3 }
		]
	},
	area: {
		label: 'Area',
		from: 'm2',
		to: 'ft2',
		units: [
			{ id: 'cm2', label: 'Square centimetres', symbol: 'cm²', factor: 1e-4 },
			{ id: 'm2', label: 'Square metres', symbol: 'm²', factor: 1 },
			{ id: 'ha', label: 'Hectares', symbol: 'ha', factor: 1e4 },
			{ id: 'km2', label: 'Square kilometres', symbol: 'km²', factor: 1e6 },
			{ id: 'in2', label: 'Square inches', symbol: 'in²', factor: IN ** 2 },
			{ id: 'ft2', label: 'Square feet', symbol: 'ft²', factor: FT ** 2 },
			{ id: 'yd2', label: 'Square yards', symbol: 'yd²', factor: 0.9144 ** 2 },
			{ id: 'acre', label: 'Acres', symbol: 'ac', factor: 4046.8564224 },
			{ id: 'mi2', label: 'Square miles', symbol: 'mi²', factor: 1609.344 ** 2 }
		]
	},
	temperature: {
		label: 'Temperature',
		from: 'c',
		to: 'f',
		// factor unused: converted through kelvin below
		units: [
			{ id: 'c', label: 'Celsius', symbol: '°C', factor: 1 },
			{ id: 'f', label: 'Fahrenheit', symbol: '°F', factor: 1 },
			{ id: 'k', label: 'Kelvin', symbol: 'K', factor: 1 }
		]
	},
	speed: {
		label: 'Speed',
		from: 'kmh',
		to: 'mph',
		units: [
			{ id: 'ms', label: 'Metres per second', symbol: 'm/s', factor: 1 },
			{ id: 'kmh', label: 'Kilometres per hour', symbol: 'km/h', factor: 1000 / 3600 },
			{ id: 'mph', label: 'Miles per hour', symbol: 'mph', factor: 1609.344 / 3600 },
			{ id: 'fts', label: 'Feet per second', symbol: 'ft/s', factor: FT },
			{ id: 'kn', label: 'Knots', symbol: 'kn', factor: 1852 / 3600 }
		]
	},
	time: {
		label: 'Time',
		from: 'h',
		to: 'min',
		units: [
			{ id: 'ms', label: 'Milliseconds', symbol: 'ms', factor: 0.001 },
			{ id: 's', label: 'Seconds', symbol: 's', factor: 1 },
			{ id: 'min', label: 'Minutes', symbol: 'min', factor: 60 },
			{ id: 'h', label: 'Hours', symbol: 'h', factor: 3600 },
			{ id: 'd', label: 'Days', symbol: 'd', factor: 86400 },
			{ id: 'wk', label: 'Weeks', symbol: 'wk', factor: 604800 },
			{ id: 'yr', label: 'Years (365.25 days)', symbol: 'yr', factor: 31557600 }
		]
	},
	data: {
		label: 'Digital storage',
		from: 'gb',
		to: 'mb',
		units: [
			{ id: 'bit', label: 'Bits', symbol: 'bit', factor: 1 / 8 },
			{ id: 'b', label: 'Bytes', symbol: 'B', factor: 1 },
			{ id: 'kb', label: 'Kilobytes (1000)', symbol: 'kB', factor: 1e3 },
			{ id: 'mb', label: 'Megabytes (1000²)', symbol: 'MB', factor: 1e6 },
			{ id: 'gb', label: 'Gigabytes (1000³)', symbol: 'GB', factor: 1e9 },
			{ id: 'tb', label: 'Terabytes (1000⁴)', symbol: 'TB', factor: 1e12 },
			{ id: 'kib', label: 'Kibibytes (1024)', symbol: 'KiB', factor: 1024 },
			{ id: 'mib', label: 'Mebibytes (1024²)', symbol: 'MiB', factor: 1024 ** 2 },
			{ id: 'gib', label: 'Gibibytes (1024³)', symbol: 'GiB', factor: 1024 ** 3 },
			{ id: 'tib', label: 'Tebibytes (1024⁴)', symbol: 'TiB', factor: 1024 ** 4 }
		]
	},
	energy: {
		label: 'Energy',
		from: 'kcal',
		to: 'kj',
		units: [
			{ id: 'j', label: 'Joules', symbol: 'J', factor: 1 },
			{ id: 'kj', label: 'Kilojoules', symbol: 'kJ', factor: 1000 },
			{ id: 'cal', label: 'Calories (small)', symbol: 'cal', factor: 4.184 },
			{ id: 'kcal', label: 'Kilocalories (food Calories)', symbol: 'kcal', factor: 4184 },
			{ id: 'wh', label: 'Watt-hours', symbol: 'Wh', factor: 3600 },
			{ id: 'kwh', label: 'Kilowatt-hours', symbol: 'kWh', factor: 3.6e6 },
			{ id: 'btu', label: 'British thermal units', symbol: 'BTU', factor: 1055.05585262 }
		]
	},
	pressure: {
		label: 'Pressure',
		from: 'psi',
		to: 'bar',
		units: [
			{ id: 'pa', label: 'Pascals', symbol: 'Pa', factor: 1 },
			{ id: 'kpa', label: 'Kilopascals', symbol: 'kPa', factor: 1000 },
			{ id: 'bar', label: 'Bar', symbol: 'bar', factor: 1e5 },
			{ id: 'psi', label: 'Pounds per square inch', symbol: 'psi', factor: (LB * 9.80665) / IN ** 2 },
			{ id: 'atm', label: 'Atmospheres', symbol: 'atm', factor: 101325 },
			{ id: 'mmhg', label: 'Millimetres of mercury', symbol: 'mmHg', factor: 133.322387415 }
		]
	}
};

/** Temperature goes through kelvin; everything else through the base unit. */
export function convert(category: string, value: number, from: string, to: string): number {
	if (category === 'temperature') {
		const k = from === 'c' ? value + 273.15 : from === 'f' ? ((value - 32) * 5) / 9 + 273.15 : value;
		return to === 'c' ? k - 273.15 : to === 'f' ? ((k - 273.15) * 9) / 5 + 32 : k;
	}
	const units = CATEGORIES[category].units;
	const f = units.find((u) => u.id === from)!.factor;
	const t = units.find((u) => u.id === to)!.factor;
	return (value * f) / t;
}

/** Up to 10 significant digits, exponent form only for extreme values. */
export function fmt(x: number): string {
	if (!Number.isFinite(x)) return DASH;
	if (x === 0) return '0';
	const a = Math.abs(x);
	if (a >= 1e15 || a < 1e-6) {
		const [m, e] = x.toExponential(6).split('e');
		return `${m.replace(/\.?0+$/, '')} × 10${toSuperscript(Number(e))}`;
	}
	const p = Number(x.toPrecision(10));
	return p.toLocaleString('en-US', { maximumFractionDigits: 10 });
}

function toSuperscript(n: number): string {
	const map: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
	return String(n).split('').map((c) => map[c] ?? c).join('');
}

const unitInputs: CalculatorInput[] = Object.entries(CATEGORIES).flatMap(([cat, c]) => {
	const options = c.units.map((u) => ({ label: `${u.label} (${u.symbol})`, value: u.id }));
	const when = (v: InputValues) => v.category === cat;
	return [
		{ id: `${cat}From`, label: 'From', type: 'select', display: 'menu', default: c.from, options, visibleWhen: when },
		{ id: `${cat}To`, label: 'To', type: 'select', display: 'menu', default: c.to, options, visibleWhen: when }
	] satisfies CalculatorInput[];
});

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'category',
			label: 'What are you converting?',
			type: 'select',
			display: 'menu',
			default: 'length',
			options: Object.entries(CATEGORIES).map(([value, c]) => ({ value, label: c.label }))
		},
		{ id: 'value', label: 'Value', type: 'number', default: 100 },
		...unitInputs
	],
	calculate(v): CalculationResult {
		const cat = String(v.category);
		const c = CATEGORIES[cat];
		const value = Number(v.value);
		if (!c || !Number.isFinite(value)) return { primaryResult: DASH, primaryLabel: 'Result', summary: 'Enter a number to convert.' };
		const from = String(v[`${cat}From`]);
		const to = String(v[`${cat}To`]);
		const fu = c.units.find((u) => u.id === from);
		const tu = c.units.find((u) => u.id === to);
		if (!fu || !tu) return { primaryResult: DASH, primaryLabel: 'Result', summary: 'Pick both units.' };
		if (cat === 'temperature' && convert(cat, value, from, 'k') < 0) {
			return { primaryResult: DASH, primaryLabel: 'Result', summary: 'That is below absolute zero (0 K), which isn’t possible.' };
		}
		const out = convert(cat, value, from, to);
		const one = cat === 'temperature' ? null : convert(cat, 1, from, to);
		return {
			primaryResult: `${fmt(out)} ${tu.symbol}`,
			primaryLabel: `${fmt(value)} ${fu.symbol} in ${tu.label.toLowerCase()}`,
			summary: one === null ? `${fmt(value)} ${fu.symbol} = ${fmt(out)} ${tu.symbol}` : `1 ${fu.symbol} = ${fmt(one)} ${tu.symbol}`,
			table: {
				title: `${fmt(value)} ${fu.symbol} in every ${c.label.toLowerCase()} unit`,
				columns: [
					{ key: 'unit', label: 'Unit' },
					{ key: 'value', label: 'Value', align: 'end' }
				],
				rows: c.units.map((u) => ({ unit: `${u.label} (${u.symbol})`, value: fmt(convert(cat, value, from, u.id)) }))
			}
		};
	},
	content: {
		intro:
			'Convert between metric and imperial units in ten everyday categories, from centimetres and inches to kilograms, gallons, °F and gigabytes. Every unit in the category is shown at once, so you can compare them side by side.',
		howTo: [
			'Choose what you are converting, such as length or temperature.',
			'Enter the value and pick the unit you have and the unit you want.',
			'Read the answer, or check the table to see the value in every unit.'
		],
		about: [
			{
				heading: 'How unit conversion works',
				paragraphs: [
					'Most conversions use a fixed factor. Each unit is a set size of its category, such as 1 inch or 1 pound. To convert, multiply by the size of the unit you have, then divide by the size of the unit you want.',
					'Many imperial units now have exact definitions. An inch is exactly 2.54 centimetres, and a pound is exactly 0.45359237 kilograms. This calculator uses those exact values, so results are not rounded along the way.'
				]
			},
			{
				heading: 'Metric and imperial in daily life',
				paragraphs: [
					'Most countries use metric units for most things. The United States uses imperial or US customary units in daily life, such as miles, pounds and gallons. The UK mixes the two: road distances are in miles, while fuel is sold in litres and milk is often sold in pints. Even imperial units can differ, because a US gallon is smaller than a UK gallon.',
					'If you are reading a recipe, a product label or a road sign, check which system it uses. Shoe sizes, for example, follow their own systems, as the [shoe size conversion](/shoe-size-conversion) explains.'
				]
			},
			{
				heading: 'Temperature is not a simple factor',
				paragraphs: [
					'Temperature scales start in different places, so they need a formula rather than a multiplier. Water freezes at 0 °C, which is 32 °F, and boils at 100 °C, which is 212 °F. Kelvin starts at absolute zero, so 0 K is the lowest possible temperature. For a quick check of weather reports, 25 °C is about 77 °F.',
					'Because of this, a change of 10 degrees Celsius is not the same as a change of 10 degrees Fahrenheit. The calculator uses kelvin as a middle step to keep the conversion correct.'
				]
			},
			{
				heading: 'Speed, fuel and energy',
				paragraphs: [
					'Speed limits and car fuel figures are often in different units. For example, 1 mile per hour is about 1.609 km/h. A speed of 60 mph is about 96.6 km/h. For trips, the [speed calculator](/speed-calculator) works out time from distance and speed.',
					'Food labels in many countries show energy in both kilojoules and kilocalories. One kilocalorie is about 4.184 kilojoules. For fuel costs, the [fuel cost calculator](/fuel-cost-calculator) can turn litres or gallons into money.'
				]
			},
			{
				heading: 'Digital storage: decimal or binary',
				paragraphs: [
					'Storage makers count in powers of 1,000, so 1 GB is 1,000,000,000 bytes. Computers often count in powers of 1,024, which gives the GiB, or gibibyte. This is why a drive can look smaller on screen than on its label.',
					'The category lists both kinds, so you can see the gap for any size. For example, 1 GiB is about 1.074 GB. The gap grows with size, so a 1 TB drive is about 0.91 TiB on a computer.'
				]
			}
		],
		formulas: [
			{
				title: 'Most units',
				expression: 'result = value × (size of “from” unit ÷ size of “to” unit)',
				variables: []
			},
			{
				title: 'Temperature',
				expression: '°F = °C × 9 ÷ 5 + 32\n°C = (°F − 32) × 5 ÷ 9\nK = °C + 273.15',
				variables: []
			},
			{
				title: 'Exact definitions used',
				expression: '1 in = 2.54 cm · 1 lb = 0.45359237 kg · 1 US gal = 3.785411784 L · 1 mi = 1,609.344 m',
				variables: []
			}
		],
		example: {
			title: 'Convert 100 centimetres to inches',
			steps: ['1 inch is exactly 2.54 cm', '100 ÷ 2.54 = 39.37007874'],
			result: '100 cm = 39.37007874 in (about 3 ft 3.4 in).'
		},
		faq: [
			{
				q: 'How many inches are in a centimetre?',
				a: 'One centimetre is about 0.3937 inches, because an inch is defined as exactly 2.54 centimetres.'
			},
			{
				q: 'How do I convert kilograms to pounds?',
				a: 'Multiply by about 2.20462. One pound is defined as exactly 0.45359237 kilograms, so 1 kg = 1 ÷ 0.45359237 lb.'
			},
			{
				q: 'How do I convert Celsius to Fahrenheit?',
				a: 'Multiply the Celsius value by 9, divide by 5, then add 32. So 25 °C is 25 × 9 ÷ 5 + 32 = 77 °F.'
			},
			{
				q: 'Why are there two kinds of megabyte?',
				a: 'Storage makers use decimal units (1 MB = 1,000,000 bytes). Many operating systems count in binary units (1 MiB = 1,048,576 bytes). That is why a “500 GB” drive shows as about 465 GiB.'
			},
			{
				q: 'Is a US gallon the same as an imperial gallon?',
				a: 'No. A US gallon is 3.785 litres, while an imperial (UK) gallon is 4.546 litres, about 20% larger.'
			}
		],
		sources: [{ title: 'NIST — SI Units and conversion factors (Special Publication 811)', url: 'https://www.nist.gov/pml/special-publication-811' }]
	}
});
