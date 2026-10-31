import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './sleep-calculator.meta';

const CYCLE_MINUTES = 90;
const FALL_ASLEEP_MINUTES = 15;
const MINUTES_PER_DAY = 1_440;
const CYCLE_OPTIONS = [6, 5, 4];
/** The option shown as the headline result: five full cycles (7.5 hours). */
const HEADLINE_CYCLES = 5;

/** "HH:MM" (24-hour) to minutes after midnight. Null when the text is not a valid time. */
export function minutesOf(s: string): number | null {
	const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(s);
	return m ? +m[1] * 60 + +m[2] : null;
}

/** Minutes after midnight to "h:mm AM" / "h:mm PM". */
export function clock12(total: number): string {
	const mins = ((total % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
	const h24 = Math.floor(mins / 60);
	const h = h24 % 12 || 12;
	return `${h}:${String(mins % 60).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`;
}

const mode = (m: string) => (v: InputValues) => v.mode === m;

const invalid = (summary: string): CalculationResult => ({ primaryResult: DASH, primaryLabel: 'Bedtime', summary });

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'mode',
			label: 'What do you want to set?',
			type: 'select',
			display: 'segmented',
			default: 'wake',
			options: [
				{ label: 'I want to wake up at', value: 'wake' },
				{ label: 'I’m going to bed at', value: 'bed' }
			]
		},
		{
			id: 'wake',
			label: 'Wake-up time',
			type: 'time',
			default: '07:00',
			help: 'Bedtimes are worked out backwards from this time.',
			visibleWhen: mode('wake')
		},
		{
			id: 'bed',
			label: 'Bedtime',
			type: 'time',
			default: '23:00',
			help: 'Wake-up times are worked out forwards from this time.',
			visibleWhen: mode('bed')
		}
	],
	calculate(v): CalculationResult {
		const wakeMode = v.mode !== 'bed';
		const anchor = minutesOf(String(wakeMode ? v.wake : v.bed));
		if (anchor === null) return invalid('Enter a valid time.');

		const rows = CYCLE_OPTIONS.map((cycles) => {
			const asleep = cycles * CYCLE_MINUTES;
			const offset = asleep + FALL_ASLEEP_MINUTES;
			return {
				cycles: `${cycles} cycles`,
				hours: `${num(asleep / 60, 1)} hours`,
				time: clock12(wakeMode ? anchor - offset : anchor + offset)
			};
		});
		const headline = rows[CYCLE_OPTIONS.indexOf(HEADLINE_CYCLES)];

		return {
			primaryResult: headline.time,
			primaryLabel: wakeMode ? 'Bedtime for 5 cycles' : 'Wake-up time for 5 cycles',
			summary: 'Five full cycles is 7.5 hours of sleep, with 15 minutes allowed to fall asleep.',
			secondaryMetrics: [
				{ label: 'Time to fall asleep', value: '15 minutes' },
				{ label: 'Length of one cycle', value: '90 minutes' },
				{ label: 'Adult guideline', value: '7 or more hours' }
			],
			table: {
				title: wakeMode ? `Bedtimes to wake at ${clock12(anchor)}` : `Wake-up times after going to bed at ${clock12(anchor)}`,
				columns: [
					{ key: 'cycles', label: 'Sleep cycles' },
					{ key: 'hours', label: 'Time asleep' },
					{ key: 'time', label: wakeMode ? 'Go to bed at' : 'Wake up at', align: 'end' }
				],
				rows
			}
		};
	},
	content: {
		intro:
			'Plan your night around sleep cycles. Pick a wake-up time to see when to go to bed, or pick a bedtime to see when to wake up. It’s a simple guide for getting a full night’s rest.',
		howTo: [
			'Choose whether you want to set a wake-up time or a bedtime.',
			'Enter that time with the time picker.',
			'Pick a row from the table. Each row is a number of full 90-minute sleep cycles.',
			'Treat the times as a guide, because everyone’s sleep is different.'
		],
		about: [
			{
				heading: 'How much sleep adults need',
				paragraphs: [
					'The US Centers for Disease Control and Prevention (CDC) advises that adults get 7 or more hours of sleep per night on a regular basis. The UK’s NHS says most adults need between 7 and 9 hours. Children and teenagers usually need more.',
					'The 7.5-hour row in this calculator is a common target for adults. Some people feel fine on a little less or need a little more. Pay more attention to how you feel during the day than to any single number. To count the hours between two clock times, the [hours calculator](/hours-calculator) is quick.'
				]
			},
			{
				heading: 'What a sleep cycle is',
				paragraphs: [
					'During the night, sleep moves through stages. It goes from light sleep to deep sleep and then to REM sleep, the stage linked with vivid dreams. One full pattern takes about 90 minutes on average, and then it repeats.',
					'Deep sleep is more common early in the night, and REM sleep becomes longer toward morning. Because of this, a full night with several cycles is more restful than a short night, even when the total hours are similar.'
				]
			},
			{
				heading: 'Why the 15-minute allowance',
				paragraphs: [
					'Most adults take some time to fall asleep. The calculator assumes 15 minutes. This is a planning figure, not a measurement. Your own time may be shorter or longer.',
					'If you usually lie awake for 30 minutes, move your bedtime 15 minutes earlier to keep the same wake-up time. Over a week, a small change can make a big difference to how rested you feel.'
				]
			},
			{
				heading: 'Habits that help you sleep',
				paragraphs: [
					'A regular wake-up time helps your body keep a steady rhythm, even at weekends. Many people also find that dim lights and a calm routine in the hour before bed make it easier to drift off.',
					'Caffeine can stay in the body for several hours, so a late coffee or tea may affect your sleep. The [time calculator](/time-calculator) can help you plan the hours before bed.'
				],
				list: [
					'Keep the same wake-up time on most days.',
					'Avoid large meals and strong caffeine close to bedtime.',
					'Keep the bedroom cool, dark and quiet if you can.',
					'Get daylight in the morning to support your body clock.'
				]
			},
			{
				heading: 'When to talk to a doctor',
				paragraphs: [
					'See a doctor if you have trouble sleeping most nights for several weeks, feel very sleepy during the day, or snore loudly with pauses in your breathing. These can be signs of a sleep problem that needs treatment.',
					'If you have recently changed time zones, the [time zone calculator](/time-zone-calculator) helps you work out your local bedtime, and the change usually settles within a few days.'
				]
			}
		],
		formulas: [
			{
				title: 'Time asleep',
				expression: 'Time asleep = cycles × 90 minutes',
				variables: [{ symbol: '90', meaning: 'minutes in one sleep cycle' }]
			},
			{
				title: 'Bedtime for a wake-up time',
				expression: 'Bedtime = wake-up time − (cycles × 90 + 15) minutes',
				variables: [{ symbol: '15', meaning: 'minutes allowed to fall asleep' }]
			},
			{
				title: 'Wake-up time for a bedtime',
				expression: 'Wake-up time = bedtime + (cycles × 90 + 15) minutes',
				variables: []
			}
		],
		example: {
			title: 'Wake at 7:00 AM with five cycles',
			steps: [
				'Time asleep: 5 × 90 = 450 minutes, which is 7.5 hours.',
				'Add 15 minutes to fall asleep: 450 + 15 = 465 minutes.',
				'7:00 AM is 420 minutes after midnight. 420 − 465 = −45, which is 45 minutes before midnight, or 11:15 PM.'
			],
			result: 'Go to bed at 11:15 PM for 7.5 hours of sleep.'
		},
		faq: [
			{
				q: 'How many hours of sleep do adults need?',
				a: 'The CDC advises that adults get 7 or more hours of sleep per night on a regular basis. The NHS says most adults need between 7 and 9 hours.'
			},
			{
				q: 'Why are sleep cycles 90 minutes?',
				a: 'A typical sleep cycle moves through light, deep and REM stages and lasts about 90 minutes on average. Cycle length varies between people and through the night, so the times are a guide.'
			},
			{
				q: 'Does waking at the end of a cycle help?',
				a: 'Some people feel more refreshed when they wake at the end of a cycle. Research on this is mixed, so use the times as a starting point and notice how you feel.'
			},
			{
				q: 'What if I take longer than 15 minutes to fall asleep?',
				a: 'The calculator allows 15 minutes. If you usually take longer, move the bedtime earlier by the extra time.'
			},
			{
				q: 'Can I use this for a nap?',
				a: 'Short naps of about 20 minutes are often suggested for a quick boost. A full 90-minute cycle takes longer, and waking from deep sleep can leave you feeling groggy.'
			}
		],
		sources: [
			{ title: 'CDC: Sleep', url: 'https://www.cdc.gov/sleep/' },
			{ title: 'NHS: Sleep and tiredness', url: 'https://www.nhs.uk/live-well/sleep-and-tiredness/' }
		],
		disclaimer: 'Sleep needs differ from person to person, so these times are estimates, not medical advice. See a doctor if sleep problems persist.'
	}
});
