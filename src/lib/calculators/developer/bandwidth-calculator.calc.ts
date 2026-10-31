import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num, plural } from '../format';
import meta from './bandwidth-calculator.meta';

/** Size units as powers of the base (1 = KB, 4 = TB). */
function sizeExponent(unit: string): number | undefined {
	switch (unit) {
		case 'KB':
			return 1;
		case 'MB':
			return 2;
		case 'GB':
			return 3;
		case 'TB':
			return 4;
		default:
			return undefined;
	}
}

/** Speeds are always decimal: 1 Mbps = 1,000,000 bits per second. */
function speedBits(unit: string): number | undefined {
	switch (unit) {
		case 'Kbps':
			return 1e3;
		case 'Mbps':
			return 1e6;
		case 'Gbps':
			return 1e9;
		default:
			return undefined;
	}
}

function hms(total: number): string {
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const s = total % 60;
	return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function words(total: number): string {
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const s = total % 60;
	const parts: string[] = [];
	if (h > 0) parts.push(plural(h, 'hour'));
	if (m > 0) parts.push(plural(m, 'minute'));
	if (s > 0 || parts.length === 0) parts.push(plural(s, 'second'));
	return parts.join(', ');
}

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'mode',
			label: 'What do you want to calculate?',
			type: 'select',
			display: 'segmented',
			default: 'download',
			options: [
				{ label: 'Download time', value: 'download' },
				{ label: 'Monthly data', value: 'monthly' }
			]
		},
		{
			id: 'base',
			label: 'Size units',
			type: 'select',
			display: 'segmented',
			default: 'decimal',
			options: [
				{ label: 'Decimal (1,000)', value: 'decimal' },
				{ label: 'Binary (1,024)', value: 'binary' }
			],
			help: 'Storage and network sizes usually use 1,000. Many operating systems show file sizes in 1,024 steps.',
			visibleWhen: (v: InputValues) => v.mode !== 'monthly'
		},
		{
			id: 'size',
			label: 'File size',
			type: 'number',
			default: 4.7,
			min: 0.001,
			max: 1000000,
			step: 0.1,
			visibleWhen: (v: InputValues) => v.mode !== 'monthly'
		},
		{
			id: 'sizeUnit',
			label: 'Size unit',
			type: 'select',
			display: 'segmented',
			default: 'GB',
			options: [
				{ label: 'KB', value: 'KB' },
				{ label: 'MB', value: 'MB' },
				{ label: 'GB', value: 'GB' },
				{ label: 'TB', value: 'TB' }
			],
			visibleWhen: (v: InputValues) => v.mode !== 'monthly'
		},
		{
			id: 'speed',
			label: 'Connection speed',
			type: 'number',
			default: 100,
			min: 0.001,
			max: 100000,
			step: 1,
			visibleWhen: (v: InputValues) => v.mode !== 'monthly'
		},
		{
			id: 'avg',
			label: 'Average speed used',
			type: 'number',
			default: 20,
			min: 0,
			max: 100000,
			step: 1,
			help: 'Your typical speed while in use, not the plan maximum.',
			visibleWhen: (v: InputValues) => v.mode === 'monthly'
		},
		{
			id: 'speedUnit',
			label: 'Speed unit',
			type: 'select',
			display: 'segmented',
			default: 'Mbps',
			options: [
				{ label: 'Kbps', value: 'Kbps' },
				{ label: 'Mbps', value: 'Mbps' },
				{ label: 'Gbps', value: 'Gbps' }
			]
		},
		{
			id: 'hours',
			label: 'Hours in use per day',
			type: 'number',
			default: 6,
			min: 0,
			max: 24,
			step: 0.5,
			suffix: 'hours',
			visibleWhen: (v: InputValues) => v.mode === 'monthly'
		},
		{
			id: 'days',
			label: 'Days per month',
			type: 'number',
			default: 30,
			min: 1,
			max: 31,
			step: 1,
			suffix: 'days',
			decimal: false,
			visibleWhen: (v: InputValues) => v.mode === 'monthly'
		}
	],
	calculate(v): CalculationResult {
		const sp = speedBits(String(v.speedUnit));

		if (v.mode === 'monthly') {
			const avg = Number(v.avg);
			const hours = Number(v.hours);
			const days = Number(v.days);
			if (sp === undefined || !(avg >= 0) || !(hours >= 0) || !(days > 0)) {
				return { primaryResult: DASH, primaryLabel: 'Data used per month', summary: 'Enter an average speed, hours and days.' };
			}
			const bytesPerSecond = (avg * sp) / 8;
			const perDay = bytesPerSecond * 3600 * hours;
			const perMonth = perDay * days;
			return {
				primaryResult: `${num(perMonth / 1e9, 2)} GB`,
				primaryLabel: 'Data used per month',
				summary: `${num(hours, 1)} hours a day for ${plural(days, 'day')} at ${num(avg, 2)} ${String(v.speedUnit)} on average, in decimal GB.`,
				secondaryMetrics: [
					{ label: 'Per day', value: `${num(perDay / 1e9, 2)} GB` },
					{ label: 'Per hour in use', value: `${num((bytesPerSecond * 3600) / 1e9, 2)} GB` },
					{ label: 'Total in GiB (binary)', value: `${num(perMonth / 1024 ** 3, 2)} GiB` },
					{ label: 'Average transfer rate', value: `${num(bytesPerSecond / 1e6, 2)} MB/s` }
				]
			};
		}

		const size = Number(v.size);
		const speed = Number(v.speed);
		const exp = sizeExponent(String(v.sizeUnit));
		if (!(size > 0) || !(speed > 0) || exp === undefined || sp === undefined) {
			return { primaryResult: DASH, primaryLabel: 'Download time (h:mm:ss)', summary: 'Enter a file size and a speed above zero.' };
		}
		// Size in bytes, then bits: every byte is 8 bits. Speeds are already in bits per second.
		const base = v.base === 'binary' ? 1024 : 1000;
		const bits = size * base ** exp * 8;
		const bitsPerSecond = speed * sp;
		const seconds = bits / bitsPerSecond;
		const total = Math.round(seconds);

		return {
			primaryResult: hms(total),
			primaryLabel: 'Download time (h:mm:ss)',
			summary: `About ${words(total)} at ${num(speed, 2)} ${String(v.speedUnit)}, before protocol overhead and congestion.`,
			secondaryMetrics: [
				{ label: 'Size in bits', value: num(bits, 0) },
				{ label: 'Transfer rate (MB/s)', value: num(bitsPerSecond / 8 / 1e6, 2) },
				{ label: 'Time in seconds', value: num(seconds, 2) },
				{ label: 'Time in hours', value: num(seconds / 3600, 3) }
			]
		};
	},
	content: {
		intro:
			'This bandwidth calculator estimates how long a file takes to download at a set connection speed, or how much data a month of daily use will use. It converts between bits, which speeds use, and bytes, which file sizes use.',
		howTo: [
			'Choose Download time, or Monthly data.',
			'For a download, enter the file size and its unit, then the connection speed and its unit.',
			'For monthly data, enter your average speed in use, the hours you use it each day and the number of days.',
			'Read the result. Download times are rounded to the nearest second, and the working shows the size in bits.'
		],
		about: [
			{
				heading: 'Bits, bytes and why they matter',
				paragraphs: [
					'A bit is the smallest unit of digital information. It holds a single 0 or 1. A byte is a group of 8 bits, and file sizes are measured in bytes, such as megabytes (MB) and gigabytes (GB).',
					'Internet speeds are measured in bits per second, such as megabits per second (Mbps). So a 100 Mbps connection moves 100 million bits each second, which is only 12.5 million bytes, or 12.5 MB, per second.',
					'This is why a 100 Mbps connection does not download a 100 MB file in one second. The calculator multiplies the file size by 8 first, so both sides use the same unit.'
				]
			},
			{
				heading: 'Decimal and binary sizes',
				paragraphs: [
					'Storage and network labels usually use decimal prefixes. One kilobyte is 1,000 bytes, one megabyte is 1,000,000 bytes, and one gigabyte is 1,000,000,000 bytes. The International System of Units (SI) defines these prefixes, and network speeds always use them.',
					'Some operating systems show file sizes in binary steps of 1,024, so a file can look larger. The binary units are called kibibytes (KiB), mebibytes (MiB) and gibibytes (GiB), defined by the IEC. One GiB is 1,073,741,824 bytes.',
					'The difference grows with size. At the gigabyte level it is about 7%, which is why the same file can have two different sizes on two different screens. The calculator lets you pick either base.'
				],
				table: {
					caption: 'Decimal and binary sizes compared',
					columns: ['Decimal unit', 'Bytes', 'Binary unit', 'Bytes'],
					rows: [
						['1 KB', '1,000', '1 KiB', '1,024'],
						['1 MB', '1,000,000', '1 MiB', '1,048,576'],
						['1 GB', '1,000,000,000', '1 GiB', '1,073,741,824'],
						['1 TB', '1,000,000,000,000', '1 TiB', '1,099,511,627,776']
					]
				}
			},
			{
				heading: 'Monthly data and real-world speed',
				paragraphs: [
					'For a monthly estimate, the calculator uses your average speed in use, not the maximum on your plan. Most connections rarely reach the top speed for long, so a typical speed gives a more realistic total.',
					'Each hour of use at a steady speed adds a fixed amount of data. Multiply that by the hours per day and the number of days to get a month. If you want to measure your real speed first, a speed test gives a useful starting figure.',
					'Actual download times are longer than the best-case figure. Protocol overhead, Wi-Fi limits, the server and other devices on the network all reduce the speed. For network addressing, the [IP subnet calculator](/ip-subnet-calculator) covers a related topic, and the [binary calculator](/binary-calculator) helps you see the bits.'
				]
			},
			{
				heading: 'Tips for estimating data use',
				paragraphs: ['Small choices change the answer a lot. Check these points before you plan a data budget:'],
				list: [
					'**Check the unit.** Look for Mbps or MB/s, and remember that 8 bits make a byte.',
					'**Use a realistic speed.** A speed test on your connection beats the advertised maximum.',
					'**Count every device.** Video, updates and backups all add to the monthly total.',
					'**Allow a margin.** Estimates are rough, so keep some room under your plan limit.',
					'**Explore more tools.** The [developer tools](/developer-tools) section covers other calculators for encoding and networks.'
				]
			}
		],
		formulas: [
			{
				title: 'Download time',
				expression: 'time (s) = file size (bytes) × 8 ÷ speed (bits per second)',
				variables: [
					{ symbol: '× 8', meaning: 'converts bytes to bits, because one byte is 8 bits' },
					{ symbol: 'speed', meaning: 'Mbps × 1,000,000, Kbps × 1,000 or Gbps × 1,000,000,000 bits per second' }
				]
			},
			{
				title: 'Monthly data',
				expression: 'GB per month = average speed (bits/s) ÷ 8 × hours × 3,600 × days ÷ 10⁹',
				variables: [
					{ symbol: '÷ 8', meaning: 'converts bits per second to bytes per second' },
					{ symbol: '10⁹', meaning: 'bytes in one decimal gigabyte' }
				]
			},
			{
				title: 'Decimal or binary size',
				expression: 'decimal: 1 GB = 1,000³ bytes;   binary: 1 GiB = 1,024³ bytes',
				variables: [{ symbol: 'GiB', meaning: 'gibibyte, the binary unit that some systems label GB' }]
			}
		],
		example: {
			title: 'A 4.7 GB file on a 100 Mbps connection',
			steps: [
				'Size in bits: 4.7 GB × 1,000,000,000 × 8 = 37,600,000,000 bits.',
				'Speed in bits per second: 100 Mbps = 100,000,000 bits per second.',
				'Time: 37,600,000,000 ÷ 100,000,000 = 376 seconds.',
				'Convert: 376 seconds = 6 minutes and 16 seconds.'
			],
			result: 'The download takes about 0:06:16 at best. The transfer rate is 12.5 MB/s.'
		},
		faq: [
			{
				q: 'Why does my download run at one eighth of my plan speed?',
				a: 'Internet plans are sold in bits per second (Mbps), but file sizes are in bytes (MB). One byte is 8 bits, so 100 Mbps moves about 12.5 MB of data each second. Protocol overhead and shared networks lower it further.'
			},
			{
				q: 'Why does my file look bigger on my computer than on the label?',
				a: 'Some systems count in 1,024-byte steps and label them KB, MB and GB. Storage and network labels usually use 1,000. A 1 GB file is 1,000,000,000 bytes in decimal and 1,073,741,824 bytes in binary.'
			},
			{
				q: 'How much data does streaming use?',
				a: 'It depends on the quality and the device. Use your own average speed from a speed test or your router statistics, and the hours you actually stream. The monthly result is an estimate, so give it a margin.'
			},
			{
				q: 'Is the download time exact?',
				a: 'No. It is the best-case time at your speed. Real transfers are slower because of overhead, Wi-Fi limits, server speed and other devices on the network.'
			}
		],
		sources: [
			{ title: 'NIST: Prefixes for binary multiples', url: 'https://physics.nist.gov/cuu/Units/binary.html' },
			{ title: 'NIST SP 811: Guide for the Use of the International System of Units (SI)', url: 'https://www.nist.gov/pml/special-publication-811' }
		]
	}
});
