import { defineCalculator } from '../types';
import meta from './dice-roller.meta';

export default defineCalculator({
	meta,
	widget: { name: 'dice' },
	inputs: [],
	calculate: () => ({ primaryResult: '', primaryLabel: '' }),
	content: {
		intro:
			'Roll virtual dice for board games, tabletop role-playing games and classroom probability. Choose the dice type and how many, add a modifier, and see every die plus the total.',
		howTo: [
			'Pick the type of dice: d6 is an ordinary six-sided die, and d20 is the twenty-sided die used in many role-playing games.',
			'Choose how many dice to roll (up to 20) and any modifier to add or subtract.',
			'Press Roll. The last eight rolls stay listed on the page until you reload it, so you can check them.'
		],
		about: [
			{
				heading: 'Reading dice notation',
				paragraphs: [
					'Dice notation uses a short code. In “3d6+2”, the 3 is how many dice to roll, the d means die, the 6 is the number of sides and the +2 is the modifier. You roll three six-sided dice, add the faces, then add 2.',
					'A plain “d20” means one twenty-sided die. “d100” gives a number from 1 to 100, which is often used for percentage rolls in games.'
				]
			},
			{
				heading: 'Are virtual dice fair?',
				paragraphs: [
					'Each die here is rolled with your browser’s cryptographic random number generator. The generator removes any small bias, so every face has the same chance. This is how a fair die should behave.',
					'Real dice can be slightly uneven because of their shape or wear. A virtual roller avoids that problem, but it does not replace a certified casino die for a formal game with money at stake.'
				]
			},
			{
				heading: 'Probability with two dice',
				paragraphs: [
					'One six-sided die gives each face a 1 in 6 chance. Two dice are more interesting, because some totals can be made in more than one way. For example, 7 can come from 1 and 6, 2 and 5, or 3 and 4, in any order.',
					'The table shows every total for 2d6. Totals near the middle are much more common than totals at the ends, which is why many board games use two dice.'
				],
				table: {
					caption: 'Chance of each total with 2d6',
					columns: ['Total', 'Ways out of 36', 'Chance'],
					rows: [
						['2', '1', '2.8%'],
						['3', '2', '5.6%'],
						['4', '3', '8.3%'],
						['5', '4', '11.1%'],
						['6', '5', '13.9%'],
						['7', '6', '16.7%'],
						['8', '5', '13.9%'],
						['9', '4', '11.1%'],
						['10', '3', '8.3%'],
						['11', '2', '5.6%'],
						['12', '1', '2.8%']
					]
				}
			},
			{
				heading: 'Modifiers and average results',
				paragraphs: [
					'The average of one die is halfway between 1 and the top face. For a d6 it is 3.5, and for a d20 it is 10.5. To find the average of several dice, add their averages, then add the modifier. For 2d6+3, the average is 2 × 3.5 + 3 = 10.',
					'Averages help you judge a roll, but a single roll can differ a lot from the average. For a long run of rolls, the results move closer to the average.'
				]
			},
			{
				heading: 'Advantage and disadvantage in games',
				paragraphs: [
					'Some role-playing games use advantage. You roll two d20 and keep the higher result. Disadvantage keeps the lower one. Advantage raises the average of a d20 roll from 10.5 to about 13.8, which is why it is powerful.',
					'For probability questions beyond a single roll, the [probability calculator](/probability-calculator) can help. To check the average of a set of rolls, the [average calculator](/average-calculator) works well.'
				]
			},
			{
				heading: 'Dice in the classroom',
				paragraphs: [
					'Dice are a simple way to show probability. Roll two dice 50 times, record the totals and compare the results with the table above. Your results will not match the table exactly, but they will move closer to it as you roll more.',
					'For a larger class experiment, the [random number generator](/random-number-generator) gives more numbers quickly, and the [mean, median, mode and range calculator](/mean-median-mode-range-calculator) summarises the results.'
				]
			}
		],
		formulas: [
			{
				title: 'Each die',
				expression: 'Result = uniform random integer from 1 to s; Total = sum of the dice + modifier',
				variables: [{ symbol: 's', meaning: 'number of sides' }]
			},
			{
				title: 'Average total',
				expression: 'Average = n × (s + 1) ÷ 2 + modifier',
				variables: [{ symbol: 'n', meaning: 'number of dice' }]
			}
		],
		example: {
			title: 'Rolling 2d6',
			steps: ['Each die shows 1 to 6 with equal chance', 'Totals range from 2 to 12; 7 is the most likely (6 of 36 ways, 16.7%)', 'Average total: 2 × 3.5 = 7'],
			result: 'A 2d6 roll averages 7.'
		},
		faq: [
			{
				q: 'What does “2d6+3” mean?',
				a: 'Roll two six-sided dice, add them, then add 3. The number before the d is how many dice; the number after is how many sides each has.'
			},
			{
				q: 'Is this dice roller fair?',
				a: 'Yes. Every roll uses your browser’s cryptographic random generator with bias removed, so each face is exactly as likely as any other. Nothing is sent to a server.'
			},
			{
				q: 'How do I roll with advantage in D&D?',
				a: 'Roll 2d20 and keep the higher die (or the lower one for disadvantage). Both dice are shown after each roll.'
			},
			{
				q: 'What is the most common total with two dice?',
				a: 'The total of 7 is the most common, with a 1 in 6 chance. The totals 2 and 12 are the rarest, at 1 in 36 each.'
			},
			{
				q: 'How many dice can I roll at once?',
				a: 'You can roll up to 20 dice in one go, using any of the seven dice types from d4 to d100.'
			}
		]
	}
});
