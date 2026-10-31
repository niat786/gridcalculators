import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, moneyIn, plural } from '../format';
import meta from './tfsa-calculator.meta';
import { CRA_LIMITS_SOURCE, TFSA_FIRST_YEAR, TFSA_LAST_YEAR, TFSA_LIMITS, tfsaCumulativeRoom } from '../data/ca-tax-2026';

/** Content is written once at build time, so format dollars explicitly (CA$7,000). */
const cad = (n: number) => moneyIn('CAD', n, true);
/** Groups consecutive years that share one limit, e.g. "2009 to 2012" with "CA$5,000". */
function limitRows(): string[][] {
	const rows: string[][] = [];
	let start = TFSA_FIRST_YEAR;
	for (let y = TFSA_FIRST_YEAR; y <= TFSA_LAST_YEAR; y++) {
		if (y === TFSA_LAST_YEAR || TFSA_LIMITS[y + 1] !== TFSA_LIMITS[y]) {
			rows.push([start === y ? String(y) : `${start} to ${y}`, cad(TFSA_LIMITS[y])]);
			start = y + 1;
		}
	}
	return rows;
}

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'born18', label: 'Year you turned 18', type: 'number', default: 1998, min: 1900, max: 2026, step: 1, decimal: false, help: 'Room starts in the year you turn 18.' },
		{ id: 'resident', label: 'Year you became a Canadian resident', type: 'number', default: 2009, min: 1900, max: 2026, step: 1, decimal: false, help: 'Use 2009 or earlier if you have lived in Canada since the TFSA started.' },
		{ id: 'contributed', label: 'Total contributions so far', type: 'number', default: 60000, min: 0, max: 100_000_000, step: 1000, prefix: '$', help: 'Everything you have put in, up to today (including this year).' },
		{ id: 'withdrawn', label: 'Withdrawals made before 2026', type: 'number', default: 10000, min: 0, max: 100_000_000, step: 500, prefix: '$', help: 'Withdrawals from earlier years are added back to your room. Withdrawals this year are added back in January.' },
		{ id: 'balance', label: 'Current TFSA balance', type: 'number', default: 20000, min: 0, max: 100_000_000, step: 1000, prefix: '$' },
		{ id: 'yearly', label: 'Yearly contribution', type: 'number', default: 7000, min: 0, max: 10_000_000, step: 500, prefix: '$', suffix: '/yr' },
		{ id: 'rate', label: 'Annual return', type: 'number', default: 5, min: 0, max: 30, step: 0.1, suffix: '%' },
		{ id: 'years', label: 'Years to grow', type: 'number', default: 20, min: 1, max: 60, step: 1, suffix: 'years', decimal: false }
	],
	calculate(v): CalculationResult {
		const born18 = Number(v.born18);
		const resident = Number(v.resident);
		const contributed = Number(v.contributed);
		const withdrawn = Number(v.withdrawn);
		const balance = Number(v.balance);
		const yearly = Number(v.yearly);
		const rate = Number(v.rate);
		const years = Number(v.years);
		const ok =
			[born18, resident].every((n) => Number.isInteger(n) && n >= 1900 && n <= 2026) &&
			[contributed, withdrawn, balance, yearly, rate].every((n) => Number.isFinite(n) && n >= 0) &&
			rate <= 30 &&
			Number.isInteger(years) &&
			years >= 1 &&
			years <= 60;
		if (!ok) {
			return { primaryResult: DASH, primaryLabel: 'TFSA room for 2026', summary: 'Enter years between 1900 and 2026, amounts of zero or more and 1 to 60 years of growth.' };
		}
		const start = Math.max(TFSA_FIRST_YEAR, born18, resident);
		const eligibleYears = start > TFSA_LAST_YEAR ? 0 : TFSA_LAST_YEAR - start + 1;
		const cumulative = tfsaCumulativeRoom(start);
		const room = cumulative - contributed + withdrawn;
		const available = Math.max(0, room);
		const r = rate / 100;
		const g = Math.pow(1 + r, years);
		const fv = balance * g + (r === 0 ? yearly * years : (yearly * (g - 1)) / r);
		const put = balance + yearly * years;
		const over = room < 0;
		return {
			primaryResult: money(available),
			primaryLabel: 'TFSA contribution room for 2026',
			summary: over
				? `You may have contributed ${money(-room)} more than your room. Check My Account with the CRA, because excess amounts are taxed.`
				: `${plural(eligibleYears, 'eligible year')} since ${start} give ${money(cumulative)} of room in total; less ${money(contributed)} contributed, plus ${money(withdrawn)} withdrawn in earlier years.`,
			secondaryMetrics: [
				{ label: 'First year of room', value: eligibleYears > 0 ? String(start) : DASH },
				{ label: 'Total room since you became eligible', value: money(cumulative) },
				{ label: 'Contributions so far', value: money(contributed) },
				{ label: 'Withdrawals added back', value: money(withdrawn) },
				{ label: '2026 annual limit', value: money(TFSA_LIMITS[2026]) },
				{ label: `Projected balance after ${plural(years, 'year')}`, value: money(fv) },
				{ label: 'Tax-free growth in projection', value: money(fv - put) }
			],
			table: {
				title: 'Annual TFSA limits',
				collapsed: true,
				columns: [
					{ key: 'year', label: 'Year' },
					{ key: 'limit', label: 'Annual limit', align: 'end' },
					{ key: 'total', label: 'Your total room to this year', align: 'end' }
				],
				rows: Object.keys(TFSA_LIMITS)
					.map(Number)
					.map((y) => {
						let running = 0;
						for (let k = start; k <= y; k++) running += TFSA_LIMITS[k] ?? 0;
						return { year: String(y), limit: money(TFSA_LIMITS[y], true), total: y >= start ? money(running, true) : '—' };
					})
			}
		};
	},
	content: {
		intro: `Find out how much Tax-Free Savings Account (TFSA) room you have in ${TFSA_LAST_YEAR} with this TFSA calculator. It adds the official annual limit for every year since ${TFSA_FIRST_YEAR}, starting from the year you turned 18 or became a Canadian resident. Then it subtracts your contributions and adds back past withdrawals.`,
		howTo: [
			`Enter the year you turned 18 and the year you became a Canadian resident. Use ${TFSA_FIRST_YEAR} if you have lived in Canada since the TFSA began.`,
			'Enter your total contributions so far and the withdrawals you made in earlier years.',
			'Add your balance, yearly contribution, expected return and years to project tax-free growth.',
			`Read your contribution room for ${TFSA_LAST_YEAR} and the table of yearly limits.`
		],
		about: [
			{
				heading: 'What is a TFSA?',
				paragraphs: [
					'A TFSA is a Canadian account where your investment income and gains are not taxed. You can hold savings, GICs, funds or shares in it. When you take money out, you pay no tax on it either.',
					'You do not get a tax deduction for putting money in. That is the main difference from an RRSP. Instead, the benefit comes later, because all growth stays yours.',
					'The yearly limit is the same for every adult. Unused room carries forward, so you can catch up in a later year.',
					`Because it is flexible, many people use a TFSA for a house, a rainy day fund or retirement. The [RRSP calculator](/rrsp-calculator) shows the other side of the choice.`
				]
			},
			{
				heading: 'How your TFSA room is calculated',
				paragraphs: [
					`Each year the government sets a dollar limit. Your room is the sum of the yearly limits since you first became eligible. You become eligible in the latest of three years: ${TFSA_FIRST_YEAR}, the year you turned 18 and the year you became a Canadian resident.`,
					`Someone eligible since ${TFSA_FIRST_YEAR} who has never contributed has ${cad(tfsaCumulativeRoom(TFSA_FIRST_YEAR))} of room in total. For comparison, a person who turned 18 in 2020 and has lived in Canada since then has ${cad(tfsaCumulativeRoom(2020))}.`,
					'From that total, the calculator subtracts everything you have put in and adds back what you took out in earlier years.'
				],
				table: { caption: 'Annual TFSA dollar limits', columns: ['Years', 'Annual limit'], rows: limitRows() }
			},
			{
				heading: 'Withdrawals and your room',
				paragraphs: [
					'A withdrawal does not give you the room back right away. It is added to your room on January 1 of the next year. So if you take money out in 2026, you cannot safely put it back until 2027.',
					'That is why the calculator adds back only withdrawals made in earlier years. Putting in more than your room can lead to tax, so check your real figure in My Account with the CRA before you contribute.'
				]
			},
			{
				heading: 'How the growth projection works',
				paragraphs: [
					'The projection starts from your current balance and adds your yearly contribution at the end of each year. It then grows the total at the return you enter, with no tax on the growth.',
					`It does not stop you from entering a yearly contribution above ${cad(TFSA_LIMITS[TFSA_LAST_YEAR])}, since unused room can carry forward. Still, compare the total with your room, and use the [compound interest calculator](/compound-interest-calculator) to see how the same savings grow in other accounts.`
				]
			},
			{
				heading: 'Tips and limits of this tool',
				paragraphs: ['A few points help you get the most from a TFSA:'],
				list: [
					'**Check My Account first.** The CRA figure is the one that counts, and it includes details this tool cannot see.',
					'**Count this year.** Enter all your contributions, including the ones you made this year.',
					'**Plan tax-free income.** Pair a TFSA with the [CPP calculator](/cpp-calculator) when you think about retirement income.',
					'**Treat the return as a guess.** Real returns change every year and are never guaranteed.'
				]
			}
		],
		formulas: [
			{
				title: 'Contribution room',
				expression: 'Room = Σ annual limits since eligible − contributions + withdrawals from previous years',
				variables: [
					{ symbol: 'Limits', meaning: limitRows().map((r) => `${r[0]} ${r[1]}`).join('; ') },
					{ symbol: 'Eligible from', meaning: `The latest of ${TFSA_FIRST_YEAR}, the year you turned 18 and the year you became a Canadian resident` }
				]
			},
			{
				title: 'Growth',
				expression: 'FV = B × (1 + r)ⁿ + C × ((1 + r)ⁿ − 1) ÷ r',
				variables: [
					{ symbol: 'B', meaning: 'current balance' },
					{ symbol: 'C', meaning: 'yearly contribution at the end of each year' },
					{ symbol: 'r', meaning: 'annual return as a decimal' },
					{ symbol: 'n', meaning: 'number of years' }
				]
			}
		],
		example: {
			title: 'Eligible since 2009, with $60,000 contributed and $10,000 withdrawn before 2026',
			steps: [
				'Total room 2009–2026 = $109,000.',
				'Room = $109,000 − $60,000 + $10,000 = $59,000.',
				'Growth: $20,000 balance plus $7,000 a year at 5% for 20 years = $284,527.63.'
			],
			result: 'Contribution room for 2026 is $59,000.00 and the projected balance is $284,527.63.'
		},
		faq: [
			{
				q: `What is the TFSA limit for ${TFSA_LAST_YEAR}?`,
				a: `The ${TFSA_LAST_YEAR} TFSA dollar limit is ${cad(TFSA_LIMITS[TFSA_LAST_YEAR])}, the same as in ${TFSA_LAST_YEAR - 2} and ${TFSA_LAST_YEAR - 1}. Someone eligible since ${TFSA_FIRST_YEAR} who never contributed has ${cad(tfsaCumulativeRoom(TFSA_FIRST_YEAR))} of room in total.`
			},
			{
				q: 'How do I calculate my TFSA contribution room?',
				a: 'Add up the yearly limits from the year you became eligible. Subtract your total contributions, then add back withdrawals from earlier years. This calculator does those steps for you.'
			},
			{
				q: 'When are withdrawals added back to my room?',
				a: 'On January 1 of the year after the withdrawal. A withdrawal in 2026 does not create room until 2027, so this calculator only adds back withdrawals made before 2026.'
			},
			{
				q: 'Are non-residents eligible?',
				a: 'Room builds only for years you were a Canadian resident and at least 18. Enter the year you became a resident if it is after 2009 or after the year you turned 18.'
			},
			{
				q: 'Is a TFSA better than an RRSP?',
				a: 'Neither is better for everyone. A TFSA gives tax-free withdrawals but no deduction, while an RRSP gives a deduction now and taxes withdrawals later. Many people save in both.'
			}
		],
		sources: [CRA_LIMITS_SOURCE],
		disclaimer: 'Estimate only. Your exact TFSA room is shown in My Account with the CRA. This is not financial advice.'
	}
});
