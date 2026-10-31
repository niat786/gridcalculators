import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './roman-numeral-converter.meta';

/** Standard subtractive symbols, largest first. */
const SYMBOLS: [number, string][] = [
	[1000, 'M'],
	[900, 'CM'],
	[500, 'D'],
	[400, 'CD'],
	[100, 'C'],
	[90, 'XC'],
	[50, 'L'],
	[40, 'XL'],
	[10, 'X'],
	[9, 'IX'],
	[5, 'V'],
	[4, 'IV'],
	[1, 'I']
];

const LETTER_VALUES: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
const MAX = 3999;

/** Splits a whole number from 1 to 3,999 into its standard symbols, e.g. 1994 → M, CM, XC, IV. */
export function romanParts(n: number): string[] {
	const parts: string[] = [];
	let rest = n;
	for (const [value, symbol] of SYMBOLS) {
		while (rest >= value) {
			parts.push(symbol);
			rest -= value;
		}
	}
	return parts;
}

/** Reads a Roman numeral (already upper case) left to right, subtracting where a smaller letter comes first. */
export function fromRoman(s: string): number {
	let total = 0;
	for (let i = 0; i < s.length; i++) {
		const value = LETTER_VALUES[s[i]];
		const next = LETTER_VALUES[s[i + 1]] ?? 0;
		total += value < next ? -value : value;
	}
	return total;
}

const fail = (summary: string): CalculationResult => ({
	primaryResult: DASH,
	primaryLabel: 'Result',
	summary
});

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'value',
			label: 'Number or Roman numeral',
			type: 'text',
			default: '1994',
			placeholder: 'e.g. 1994 or MCMXCIV',
			maxLength: 20,
			help: 'Digits convert to a Roman numeral. Letters convert to a number. Use 1 to 3,999.'
		}
	],
	calculate(v: InputValues): CalculationResult {
		const raw = String(v.value).replace(/[\s,]+/g, '').toUpperCase();
		if (raw === '') return fail('Enter a number from 1 to 3,999, or a Roman numeral.');

		if (/^\d+$/.test(raw)) {
			const n = Number(raw);
			if (n < 1 || n > MAX) return fail('Enter a whole number from 1 to 3,999.');
			const parts = romanParts(n);
			const roman = parts.join('');
			return {
				primaryResult: roman,
				primaryLabel: 'Roman numeral',
				long: true,
				summary: `${num(n, 0)} = ${parts.join(' + ')}, which is ${parts.map((p) => fromRoman(p)).join(' + ')}.`,
				secondaryMetrics: [
					{ label: 'Decimal value', value: num(n, 0) },
					{ label: 'Roman numeral', value: roman },
					{ label: 'Letters used', value: num(roman.length, 0) }
				]
			};
		}

		if (/^[IVXLCDM]+$/.test(raw)) {
			const n = fromRoman(raw);
			// Round-trip check rejects forms such as IIII, VV and IC.
			if (n < 1 || n > MAX || romanParts(n).join('') !== raw) {
				return fail('That is not a valid Roman numeral. Check the letter order, for example IV not IIII.');
			}
			const parts = romanParts(n);
			return {
				primaryResult: num(n, 0),
				primaryLabel: 'Decimal value',
				summary: `${raw} = ${parts.join(' + ')}, which is ${parts.map((p) => fromRoman(p)).join(' + ')}.`,
				secondaryMetrics: [
					{ label: 'Decimal value', value: num(n, 0) },
					{ label: 'Roman numeral', value: raw },
					{ label: 'Letters used', value: num(raw.length, 0) }
				]
			};
		}

		return fail('Use digits, or only the letters I, V, X, L, C, D and M.');
	},
	content: {
		intro:
			'Convert a number from 1 to 3,999 into a Roman numeral, or read a Roman numeral back as a number. The breakdown shows which symbols make up the result, so you can check it by hand.',
		howTo: [
			'Type a whole number from 1 to 3,999 to get its Roman numeral.',
			'Or type a Roman numeral, using letters only, to get its decimal value.',
			'Check the breakdown in the summary to see how each part adds up.',
			'Spaces and capital letters do not matter, so mcmxciv works the same as MCMXCIV.'
		],
		about: [
			{
				heading: 'What Roman numerals are',
				paragraphs: [
					'Roman numerals are a number system that the ancient Romans used. It uses seven letters: I, V, X, L, C, D and M. Each letter stands for a fixed value, from 1 for I to 1,000 for M.',
					'The system is still used today. You will see it on clock faces and in the names of kings and queens. It also appears in book chapter numbers and in the titles of major sporting events, such as the Super Bowl.'
				]
			},
			{
				heading: 'The subtraction rule',
				paragraphs: [
					'Roman numerals add values from left to right. The exception is a smaller letter placed before a larger one. The smaller value is then taken away. So IV is 5 − 1 = 4, and IX is 10 − 1 = 9.',
					'Only a few pairs use this rule: I before V or X, X before L or C, and C before D or M. This is why 900 is written CM, not DCCCC.'
				],
				table: {
					caption: 'The six subtraction pairs',
					columns: ['Numeral', 'Value', 'Made from'],
					rows: [
						['IV', '4', '5 − 1'],
						['IX', '9', '10 − 1'],
						['XL', '40', '50 − 10'],
						['XC', '90', '100 − 10'],
						['CD', '400', '500 − 100'],
						['CM', '900', '1,000 − 100']
					]
				}
			},
			{
				heading: 'Why the range stops at 3,999',
				paragraphs: [
					'The standard system has no zero. It also needs a special notation to write numbers of 4,000 and above, which is not part of the standard set. That is why the largest common Roman numeral is MMMCMXCIX, which means 3,999.',
					'For very large numbers, some historical sources used a bar over a letter to multiply it by 1,000. This calculator does not use that notation, so it stops at 3,999.'
				]
			},
			{
				heading: 'Where you might use Roman numerals',
				paragraphs: [
					'Roman numerals are useful when a document or design needs a classic look. They are common for chapters in books, the year on a building’s cornerstone and the order of monarchs with the same name. Film credits and copyright notices often show the year in Roman numerals too.',
					'For everyday numbers, the standard digits are easier to read, add and compare. Roman numerals are harder to calculate with, which is one reason they were replaced in most trade and science. If you need to convert between number systems, the [binary calculator](/binary-calculator) and the [hex calculator](/hex-calculator) work the same way, using different bases.'
				]
			},
			{
				heading: 'Reading a long numeral',
				paragraphs: [
					'Start at the left and find the largest symbol first. Then work through the rest. For MCMXCIV, the M is 1,000, CM is 900, XC is 90 and IV is 4. Adding them gives 1,994.',
					'Practice with a few numerals from a clock, a title page or a monument, so the pattern becomes familiar. It helps to split a long numeral into groups, such as thousands, hundreds, tens and units. The [rounding calculator](/rounding-calculator) can help when you need the nearest hundred or thousand.'
				]
			}
		],
		formulas: [
			{
				title: 'Letter values',
				expression: 'I = 1, V = 5, X = 10, L = 50, C = 100, D = 500, M = 1,000',
				variables: []
			},
			{
				title: 'Reading a numeral',
				expression: 'Add each letter’s value, but subtract it when a smaller letter comes before a larger one',
				variables: [
					{ symbol: 'IV', meaning: '5 − 1 = 4' },
					{ symbol: 'XC', meaning: '100 − 10 = 90' }
				]
			}
		],
		example: {
			title: 'Converting 1994',
			steps: [
				'1994 contains 1000, so the first symbol is M, leaving 994.',
				'994 contains 900, written CM (1000 − 100), leaving 94.',
				'94 contains 90, written XC (100 − 10), leaving 4.',
				'4 is written IV (5 − 1).'
			],
			result: 'MCMXCIV. The breakdown is M + CM + XC + IV.'
		},
		faq: [
			{
				q: 'Why is 4 written IV and not IIII?',
				a: 'Standard Roman numerals put a smaller letter before a larger one to subtract it, so 4 is IV. The form IIII is seen on some clock faces, but it is not the standard numeral.'
			},
			{
				q: 'What is the largest number I can write?',
				a: 'The standard system runs from I (1) to MMMCMXCIX (3,999). Larger numbers need extra notation, such as a bar over a letter, which is not part of the standard set.'
			},
			{
				q: 'Did the Romans have a symbol for zero?',
				a: 'No. Roman numerals have no zero, so the converter starts at 1.'
			},
			{
				q: 'Why does my numeral show as invalid?',
				a: 'Forms such as VV, IC and IIII break the standard rules. Write V for 5, XC for 90 and IV for 4 instead.'
			},
			{
				q: 'Can I type the numeral in lower case?',
				a: 'Yes. The converter ignores capital letters and spaces, so mcmxciv and MCMXCIV give the same result.'
			}
		]
	}
});
