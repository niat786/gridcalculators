import { defineCalculator } from '../types';
import meta from './random-number-generator.meta';

export default defineCalculator({
	meta,
	widget: { name: 'random' },
	inputs: [],
	calculate: () => ({ primaryResult: '', primaryLabel: '' }),
	content: {
		intro:
			'Generate random whole numbers in any range, as many as you need, with or without repeats. You can also pick random names or items from your own list.',
		howTo: [
			'Choose Random numbers, or Pick from a list.',
			'For numbers, set the minimum, maximum and how many you want. For a list, paste your items and choose how many to pick.',
			'Leave No repeats ticked for draws such as raffles. Untick it if the same number may appear twice.',
			'Press Generate, then copy the results if you need them.'
		],
		about: [
			{
				heading: 'What a random number generator does',
				paragraphs: [
					'A random number generator picks a value that you can’t predict in advance. Every value in the range has the same chance of being picked. Nobody chooses it, and the last result doesn’t affect the next one.',
					'This tool has two modes. In number mode, it picks whole numbers between your minimum and maximum. In list mode, it picks items from a list you type, one per line or separated by commas.',
					'Results appear with commas in large numbers, such as 1,000. You can sort the results from smallest to largest if you prefer.'
				]
			},
			{
				heading: 'How the chance works',
				paragraphs: [
					'If the range is 1 to 6, there are six possible values. Each one has the same chance, which is 1 ÷ 6, or about 16.7%. In general, the chance for any one value is 1 ÷ (maximum − minimum + 1). The “+ 1” counts both ends of the range.',
					'Random doesn’t mean evenly spread. If you roll a die 10 times, you may see a 6 three times and no 2 at all. Over many more draws, the numbers even out, but a short run can look uneven.',
					'Each draw is separate. For more on chances, use the [probability calculator](/probability-calculator). A 6 on the last roll does not make a 6 less likely next time. The exception is No repeats, which stops a number from appearing twice in the same batch.'
				]
			},
			{
				heading: 'No repeats and how many you need',
				paragraphs: [
					'With No repeats ticked, each number can appear only once in the results. This is how a lottery draw or a raffle works. Each winning number is different from the others.',
					'The tool checks the numbers first. You can’t draw 11 different numbers from 1 to 10, because only 10 exist. In that case, it shows how many different numbers the range holds. To count the possible draws, try the [permutation and combination calculator](/permutation-and-combination-calculator).',
					'Untick No repeats when each result should stand alone, such as several rolls for a board game on the [dice roller](/dice-roller).'
				]
			},
			{
				heading: 'Picking from a list',
				paragraphs: [
					'In list mode, every item has the same chance of being picked. With four names and one pick, each name has a 1 ÷ 4 chance, which is 25%.',
					'If you pick two names from four, each name has a 2 ÷ 4 chance, or 50%. The tool never picks the same item twice in one draw, and the order of the picks is random too.',
					'This is useful for choosing a speaker, deciding who goes first, or splitting a group into teams. Add each person on their own line.'
				],
				list: [
					'Give every entry the same chance by listing it once.',
					'Number your entries and draw numbers, if you want a clear record of the draw.',
					'For a random yes or no, use the range 1 to 2, with 1 meaning yes.'
				]
			},
			{
				heading: 'Is the result truly random?',
				paragraphs: [
					'The tool uses your browser’s cryptographic random number generator, through the Web Crypto API. This is the same kind of randomness used for passwords, and it is much harder to predict than a simple generator.',
					'It also avoids a small bias that simple methods can add. When a range doesn’t divide evenly, some numbers could come up slightly more often. The tool rejects those extra values, so every number has the same chance.',
					'The numbers are made by a computer, not by a physical process such as dice. For most games, classes and fair draws, that is more than enough.'
				]
			}
		],
		formulas: [
			{
				title: 'Each number in a range',
				expression: 'n = minimum + random whole number from 0 to (maximum − minimum)',
				variables: [{ symbol: 'n', meaning: 'the number the tool returns' }]
			},
			{
				title: 'Chance of any one value',
				expression: 'P = 1 ÷ (maximum − minimum + 1)',
				variables: [{ symbol: 'P', meaning: 'the chance that a single draw gives one specific value' }]
			},
			{
				title: 'Chance an item is picked from a list',
				expression: 'P = k ÷ n',
				variables: [
					{ symbol: 'n', meaning: 'the number of items in the list' },
					{ symbol: 'k', meaning: 'the number of items you pick' }
				]
			}
		],
		example: {
			title: 'Pick 1 number from 1 to 100',
			steps: ['There are 100 possible numbers, from 1 to 100.', 'Each has the same chance: 1 ÷ 100 = 1%.'],
			result: 'Every number from 1 to 100 is equally likely to come up.'
		},
		faq: [
			{
				q: 'Are the numbers truly random?',
				a: 'They come from your browser’s cryptographic random number generator. It is high quality and hard to predict. Like all computer methods, it is not a physical process, but it is fair for games, classes and draws.'
			},
			{
				q: 'Can I use this for a raffle or giveaway?',
				a: 'Yes, for a simple draw. Number your entries, or list them in the box, then generate without repeats. Check any rules that apply to your own event.'
			},
			{
				q: 'What does “No repeats” do?',
				a: 'It makes sure each number in the results is different, like drawing balls from a bag without putting them back. It is ticked by default.'
			},
			{
				q: 'Can it generate decimal numbers?',
				a: 'No. The number mode uses whole numbers only. For a decimal, generate a whole number and divide it by 10, 100 or 1,000 yourself.'
			}
		],
		sources: [
			{ title: 'MDN — Crypto: getRandomValues() method', url: 'https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues' },
			{ title: 'Wikipedia — Random number generation', url: 'https://en.wikipedia.org/wiki/Random_number_generation' }
		]
	}
});
