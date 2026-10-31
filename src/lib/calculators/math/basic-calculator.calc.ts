import { defineCalculator } from '../types';
import meta from './basic-calculator.meta';

export default defineCalculator({
	meta,
	widget: { name: 'keypad', props: { mode: 'basic' } },
	inputs: [],
	calculate: () => ({ primaryResult: '', primaryLabel: '' }),
	content: {
		intro:
			'A free online calculator for everyday sums. Tap the keys or type on your keyboard. The answer appears as you type, so you can check it before you press equals.',
		howTo: [
			'Tap the keys, or type on your keyboard. Numbers, + − × ÷ and brackets all work.',
			'Watch the large number. It shows the answer while you type, before you press =.',
			'Press = or Enter to lock in the answer. Then press an operator to carry on from it.',
			'Press ⌫ to delete one character, AC to clear everything, or open History to reuse an earlier sum.'
		],
		about: [
			{
				heading: 'How the calculator works',
				paragraphs: [
					'Type a sum the way you would write it on paper. For example, 25 × 4 + 10. The calculator reads the whole line at once, so you don’t need to press = after each step.',
					'The top line shows what you typed. The large line shows the answer so far. If the sum is not complete yet, the large line may show nothing until you finish it.',
					'When you press =, the answer is saved in History. You can open History and tap any earlier sum to bring it back. Your history stays on the page until you close or reload it.'
				]
			},
			{
				heading: 'Order of operations',
				paragraphs: [
					'Calculators must decide which part of a sum to work out first. Schools in many countries teach one shared rule, often remembered as BODMAS or PEMDAS. Brackets come first, then powers, then × and ÷, and last + and −.',
					'This matters. Working left to right, 12 + 3 × 8 would give 120. The correct answer is 36, because multiplication comes before addition.',
					'Work through 12 + 3 × (8 − 2) one step at a time. Each row below is one step.'
				],
				table: {
					caption: 'Working out 12 + 3 × (8 − 2)',
					columns: ['Step', 'Calculation', 'Result'],
					rows: [
						['1. Brackets first', '8 − 2', '6'],
						['2. Multiply', '3 × 6', '18'],
						['3. Add', '12 + 18', '30']
					]
				}
			},
			{
				heading: 'Keyboard shortcuts',
				paragraphs: [
					'You don’t need the mouse. Type on your keyboard while no text box on the page is selected. Your keys work the same way as the on-screen keys.'
				],
				list: [
					'**Numbers and brackets:** type 0 to 9, ( and ). Type . for a decimal point.',
					'**Operators:** type + and - for plus and minus. Type * for × and / for ÷. Type ^ for a power, and % for percent.',
					'**Calculate:** press Enter or =.',
					'**Delete one character:** press Backspace.',
					'**Clear everything:** press Esc or Delete.',
					'**Browser shortcuts still work.** Keys with Ctrl, Cmd or Alt are left alone, so Ctrl+C still copies.'
				]
			},
			{
				heading: 'Percentages and the % key',
				paragraphs: [
					'The % key divides the number before it by 100. So 15% means 0.15, and 200 × 15% gives 30.',
					'The % key works like a phone calculator. After a plus or minus sign, it takes a percent of the number before it. So 200 + 10% gives 220, and 200 − 15% gives 170.',
					'Elsewhere, % simply divides by 100. For example, 200 × 15% gives 30. For more percent problems, use the [percentage calculator](/percentage-calculator).'
				]
			},
			{
				heading: 'Tips to avoid wrong answers',
				paragraphs: [
					'Most wrong answers come from typing the sum in a different order from the one you meant. Check the top line before you press equals.',
					'Each open bracket needs a closing bracket. If you forget the last one, the calculator adds it for you. So check the brackets if the answer looks odd.',
					'Dividing by zero has no answer, so the calculator shows an error. A negative number can start a sum with the − key, as in −5 + 8.'
				],
				list: [
					'Use brackets when you want a part of the sum done first.',
					'Use the keyboard for long sums, and check each number as you type it.',
					'For powers, roots and trigonometry, switch to the [scientific calculator](/scientific-calculator).',
					'Use the [fraction calculator](/fraction-calculator) when your answer should stay as a fraction.'
				]
			}
		],
		formulas: [
			{
				title: 'Order of operations',
				expression: 'Brackets → powers → × and ÷ (left to right) → + and − (left to right)',
				variables: [
					{ symbol: '→', meaning: 'the order in which the calculator works out each part of the sum' }
				]
			},
			{
				title: 'Percent key',
				expression: 'x% = x ÷ 100, so 200 × 15% = 200 × 0.15 = 30',
				variables: [{ symbol: 'x', meaning: 'the number before the % key' }]
			}
		],
		example: {
			title: 'Work out 12 + 3 × (8 − 2)',
			steps: [
				'Brackets first: 8 − 2 = 6',
				'Then multiplication: 3 × 6 = 18',
				'Then addition: 12 + 18 = 30'
			],
			result: 'The answer is 30, not 90. Multiplication comes before addition, so 3 × 6 is worked out first.'
		},
		faq: [
			{
				q: 'Does this calculator follow the order of operations?',
				a: 'Yes. It works out brackets first, then powers, then multiplication and division, then addition and subtraction. Type the whole sum and you get the mathematically correct answer.'
			},
			{
				q: 'Can I use my keyboard?',
				a: 'Yes. Type numbers and + - * / ^ ( ) directly. Press Enter or = to calculate, Backspace to delete one character, and Esc to clear.'
			},
			{
				q: 'How does the % key work?',
				a: 'On its own, it divides by 100, so 15% is 0.15 and 200 × 15% is 30. After a plus or minus sign, it takes a percent of the number before it. So 200 + 10% gives 220.'
			},
			{
				q: 'Why does my answer show fewer decimal places than I expected?',
				a: 'The display shows up to 12 significant digits. For example, 10 ÷ 3 shows 3.33333333333. The calculator keeps more precision inside, so the chain of sums stays accurate.'
			},
			{
				q: 'Is anything I type saved or sent anywhere?',
				a: 'The calculator runs in your browser, and the sums you type are not sent to a server. Your history is kept only on the page, and it is cleared when you reload or close it.'
			}
		],
		sources: [
			{ title: 'Wikipedia — Order of operations', url: 'https://en.wikipedia.org/wiki/Order_of_operations' },
			{ title: 'Wikipedia — Percentage', url: 'https://en.wikipedia.org/wiki/Percentage' }
		]
	}
});
