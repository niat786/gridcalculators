import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, num, plural } from '../format';
import meta from './electricity-calculator.meta';

const DAYS_PER_YEAR = 365;

function invalid(summary: string): CalculationResult {
	return { primaryResult: DASH, primaryLabel: 'Monthly cost', summary };
}

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'power',
			label: 'Device power',
			type: 'number',
			default: 100,
			min: 0,
			max: 100000,
			step: 1,
			suffix: 'W',
			help: 'Find this on the label or power adapter. Watts = volts × amps.'
		},
		{
			id: 'hours',
			label: 'Hours used per day',
			type: 'number',
			default: 8,
			min: 0,
			max: 24,
			step: 0.5,
			suffix: 'hours'
		},
		{
			id: 'days',
			label: 'Days used per month',
			type: 'number',
			default: 30,
			min: 1,
			max: 31,
			step: 1,
			decimal: false,
			suffix: 'days'
		},
		{
			id: 'price',
			label: 'Price per kWh',
			type: 'number',
			default: 0.17,
			min: 0,
			max: 10,
			step: 0.01,
			prefix: '$',
			suffix: '/kWh',
			help: 'Check your electricity bill. Rates vary by region and plan.'
		},
		{
			id: 'quantity',
			label: 'Number of devices',
			type: 'number',
			default: 1,
			min: 1,
			max: 1000,
			step: 1,
			decimal: false,
			help: 'Use this for several identical devices.'
		}
	],
	calculate(v): CalculationResult {
		const watts = Number(v.power);
		const hours = Number(v.hours);
		const days = Number(v.days);
		const price = Number(v.price);
		const quantity = Number(v.quantity);

		if (!(watts >= 0) || !Number.isFinite(watts)) return invalid('Enter the device power in watts, 0 or more.');
		if (!(hours >= 0 && hours <= 24)) return invalid('Enter the hours used per day, from 0 to 24.');
		if (!Number.isInteger(days) || days < 1 || days > 31) return invalid('Enter the days used per month, from 1 to 31.');
		if (!(price >= 0) || !Number.isFinite(price)) return invalid('Enter a price per kWh of 0 or more.');
		if (!Number.isInteger(quantity) || quantity < 1) return invalid('Enter a whole number of devices, 1 or more.');

		// kWh = watts × hours ÷ 1,000, for every device.
		const kwhDay = (watts * hours * quantity) / 1000;
		const kwhMonth = kwhDay * days;
		const kwhYear = kwhDay * DAYS_PER_YEAR;
		const costDay = kwhDay * price;
		const costMonth = kwhMonth * price;
		const costYear = kwhYear * price;

		return {
			primaryResult: money(costMonth),
			primaryLabel: 'Monthly cost',
			summary: `Covers ${plural(quantity, 'device')}, ${num(hours, 1)} hours a day, for ${plural(days, 'day')} at ${money(price)} per kWh.`,
			secondaryMetrics: [
				{ label: 'Energy per day', value: `${num(kwhDay, 2)} kWh` },
				{ label: 'Energy per month', value: `${num(kwhMonth, 1)} kWh` },
				{ label: 'Energy per year', value: `${num(kwhYear, 0)} kWh` },
				{ label: 'Cost per day', value: money(costDay) },
				{ label: 'Cost per year', value: money(costYear) }
			]
		};
	},
	content: {
		intro:
			'Find out what an appliance costs to run each day, month and year. Enter its power in watts, how long it runs and your price per kilowatt-hour, and the electricity calculator does the rest.',
		howTo: [
			'Enter the power of the device in watts. It is printed on the label or the power adapter.',
			'Enter the hours it runs each day, and the number of days each month.',
			'Enter your price per kilowatt-hour from your electricity bill.',
			'If you have several identical devices, enter the number. Then read the monthly and yearly cost.'
		],
		about: [
			{
				heading: 'What is a kilowatt-hour?',
				paragraphs: [
					'Electricity is billed in kilowatt-hours (kWh). One kilowatt-hour is the energy used by a 1,000 watt device running for one hour. A 100 watt light bulb uses 0.1 kWh in one hour.',
					'Your bill shows how many kWh you used, and the price per kWh. The total bill also includes fixed charges, taxes and other items, so this calculator covers only the energy used by the device.'
				]
			},
			{
				heading: 'How the running cost is calculated',
				paragraphs: [
					'Energy in kWh equals the power in watts times the hours of use, divided by 1,000. Then multiply the energy by your price per kWh. That gives the cost for that device.',
					'Each device is a little different. A heater may use 1,500 watts for a short time, while a laptop charger uses a small amount for a long time. The power on the label is often the maximum, so the actual use can be lower.'
				]
			},
			{
				heading: 'Prices and voltages around the world',
				paragraphs: [
					'Electricity prices vary a lot between countries, regions and tariffs. Some tariffs have a higher price at peak times, and some have a lower night rate. Use the price from your own bill, not an average.',
					'Mains voltage also varies. North America uses about 120 volts for most outlets, while most of the world uses between 220 and 240 volts. The cost formula is the same everywhere, because it uses watts, hours and kWh. For the wiring side at those voltages, the [voltage drop calculator](/voltage-drop-calculator) shows how wire size affects the supply.'
				]
			},
			{
				heading: 'Tips for cutting electricity use',
				paragraphs: [
					'The biggest savings usually come from the devices that run for many hours or use high power. Heating, cooling and water heating are often the largest loads in a home. For a room air conditioner, the [BTU calculator](/btu-calculator) estimates the size of the unit.',
					'Standby power is small for each device, but it adds up. Switch off devices at the wall or use a switch when you do not need them. For more on power, the [ohms law calculator](/ohms-law-calculator) shows how watts relate to volts and current.'
				],
				list: [
					'Use a timer or a smart plug for devices that run at set times.',
					'Choose a lower wattage setting for heaters and fans when you can.',
					'Compare the running cost of two appliances before you buy one.',
					'Check the energy label on new products, which shows the yearly use.'
				]
			},
			{
				heading: 'Electrical safety',
				paragraphs: [
					'Do not overload a socket or an extension lead. High-power devices such as heaters, kettles and cooking appliances should have their own socket, and a damaged cable or plug is a fire risk. Replace it, do not repair it with tape.',
					'If a device is hot, smells of burning or trips the circuit, switch it off and get it checked by a qualified electrician or the manufacturer.'
				]
			}
		],
		formulas: [
			{
				title: 'Energy per day',
				expression: 'kWh per day = watts × hours × devices ÷ 1,000',
				variables: [
					{ symbol: 'watts', meaning: 'the power of one device, from its label' },
					{ symbol: 'hours', meaning: 'how long it runs each day' },
					{ symbol: 'devices', meaning: 'the number of identical devices' }
				]
			},
			{
				title: 'Cost',
				expression: 'Cost = kWh × price per kWh',
				variables: [{ symbol: 'price', meaning: 'the price per kilowatt-hour from your bill' }]
			},
			{
				title: 'Month and year',
				expression: 'Monthly kWh = daily kWh × days\nYearly kWh = daily kWh × 365',
				variables: [{ symbol: '365', meaning: 'the number of days in a year' }]
			}
		],
		example: {
			title: 'A 100 watt device used for 8 hours a day at $0.17 per kWh',
			steps: [
				'Energy per day: 100 × 8 ÷ 1,000 = 0.8 kWh',
				'Energy per month: 0.8 × 30 = 24 kWh',
				'Cost per month: 24 × $0.17 = $4.08',
				'Energy per year: 0.8 × 365 = 292 kWh, which costs about $49.64'
			],
			result: 'The device costs about $4.08 a month, or $49.64 a year.'
		},
		faq: [
			{
				q: 'How do I work out the cost of an appliance?',
				a: 'Multiply its power in watts by the hours it runs, and divide by 1,000 to get kWh. Then multiply by your price per kWh. The calculator does these steps for you.'
			},
			{
				q: 'Where do I find the wattage of an appliance?',
				a: 'Look for the label on the back or bottom of the device, or on its power adapter. If only amps and volts are shown, multiply them to get watts.'
			},
			{
				q: 'Is a higher wattage always more expensive to run?',
				a: 'Not always. Cost depends on power and time together. A 60 watt fan running for 24 hours uses 1.44 kWh, which is nearly the same as a 1,500 watt heater running for one hour, at 1.5 kWh.'
			},
			{
				q: 'Why is my real bill different from this estimate?',
				a: 'The tool covers only one device at the price you enter. Your bill includes other devices, fixed charges, taxes and peak or off-peak rates, so the total will differ.'
			}
		],
		sources: [{ title: 'US Energy Information Administration', url: 'https://www.eia.gov/' }]
	}
});
