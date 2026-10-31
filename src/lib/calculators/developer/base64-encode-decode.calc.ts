import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num, plural } from '../format';
import meta from './base64-encode-decode.meta';

const STANDARD = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const URL_SAFE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** Decoding accepts both alphabets. */
const VALUE = new Map<string, number>();
[...STANDARD].forEach((ch, i) => VALUE.set(ch, i));
VALUE.set('-', 62);
VALUE.set('_', 63);

/** Bytes → Base64. Every 3 bytes (24 bits) become 4 characters of 6 bits each. */
export function base64Encode(bytes: Uint8Array, urlSafe: boolean): string {
	const alphabet = urlSafe ? URL_SAFE : STANDARD;
	let out = '';
	let i = 0;
	for (; i + 2 < bytes.length; i += 3) {
		const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
		out += alphabet[(n >> 18) & 63] + alphabet[(n >> 12) & 63] + alphabet[(n >> 6) & 63] + alphabet[n & 63];
	}
	const left = bytes.length - i;
	if (left === 1) {
		const n = bytes[i] << 16;
		out += alphabet[(n >> 18) & 63] + alphabet[(n >> 12) & 63] + (urlSafe ? '' : '==');
	} else if (left === 2) {
		const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
		out += alphabet[(n >> 18) & 63] + alphabet[(n >> 12) & 63] + alphabet[(n >> 6) & 63] + (urlSafe ? '' : '=');
	}
	return out;
}

export type Decoded = { ok: true; bytes: Uint8Array } | { ok: false; reason: string };

/** Base64 → bytes. Whitespace (line breaks) is ignored. Returns a reason when the text is not valid Base64. */
export function base64Decode(text: string): Decoded {
	const s = text.replace(/\s+/g, '');
	if (!/^[A-Za-z0-9+\/\-_]*={0,2}$/.test(s)) {
		return { ok: false, reason: 'Base64 uses only A–Z, a–z, 0–9, + and /, with = padding at the end. Check for stray characters.' };
	}
	const padding = s.length - s.replace(/=+$/, '').length;
	const body = s.slice(0, s.length - padding);
	if ((padding > 0 && s.length % 4 !== 0) || body.length % 4 === 1) {
		return { ok: false, reason: 'The length is not valid for Base64. A character may be missing or extra.' };
	}
	const bytes = new Uint8Array(Math.floor((body.length * 3) / 4));
	let acc = 0;
	let bits = 0;
	let o = 0;
	for (const ch of body) {
		acc = ((acc << 6) | (VALUE.get(ch) ?? 0)) & 0xffffff;
		bits += 6;
		if (bits >= 8) {
			bits -= 8;
			bytes[o++] = (acc >> bits) & 0xff;
		}
	}
	return { ok: true, bytes };
}

const chars = (s: string) => Array.from(s).length;
const utf8Bytes = (s: string) => new TextEncoder().encode(s).length;

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'mode',
			label: 'What do you want to do?',
			type: 'select',
			display: 'segmented',
			default: 'encode',
			options: [
				{ label: 'Encode text', value: 'encode' },
				{ label: 'Decode Base64', value: 'decode' }
			]
		},
		{
			id: 'plain',
			label: 'Text to encode',
			type: 'text',
			default: 'Café',
			multiline: true,
			monospace: true,
			placeholder: 'Type or paste text',
			visibleWhen: (v: InputValues) => v.mode !== 'decode'
		},
		{
			id: 'urlSafe',
			label: 'URL-safe alphabet',
			type: 'toggle',
			default: false,
			help: 'Uses - and _ instead of + and /, and leaves out = padding.',
			visibleWhen: (v: InputValues) => v.mode !== 'decode'
		},
		{
			id: 'encoded',
			label: 'Base64 to decode',
			type: 'text',
			default: 'SGVsbG8sIFdvcmxkIQ==',
			multiline: true,
			monospace: true,
			placeholder: 'Paste Base64 text',
			help: 'Both alphabets and missing padding are accepted.',
			visibleWhen: (v: InputValues) => v.mode === 'decode'
		}
	],
	calculate(v): CalculationResult {
		if (v.mode === 'decode') {
			const input = String(v.encoded);
			const inputBytes = utf8Bytes(input);
			if (input.replace(/\s+/g, '') === '') {
				return { primaryResult: DASH, primaryLabel: 'Decoded text', summary: 'Paste some Base64 text to decode.' };
			}
			const decoded = base64Decode(input);
			const fail = (reason: string): CalculationResult => ({
				primaryResult: DASH,
				primaryLabel: 'Decoded text',
				summary: reason,
				secondaryMetrics: [
					{ label: 'Input characters', value: num(chars(input), 0) },
					{ label: 'Decoded bytes', value: DASH },
					{ label: 'Decoded characters', value: DASH },
					{ label: 'Size change', value: DASH }
				]
			});
			if (!decoded.ok) return fail(decoded.reason);
			if (decoded.bytes.length === 0) return fail('This Base64 decodes to no data. Check the input.');
			let text: string;
			try {
				text = new TextDecoder('utf-8', { fatal: true }).decode(decoded.bytes);
			} catch {
				return fail('The decoded bytes are not UTF-8 text, so they cannot be shown here. The data may be binary, such as an image or a file.');
			}
			const change = (decoded.bytes.length / inputBytes - 1) * 100;
			return {
				primaryResult: text,
				primaryLabel: 'Decoded text',
				long: true,
				summary: `Decoded ${plural(decoded.bytes.length, 'byte')} into ${plural(chars(text), 'character')} of UTF-8 text.`,
				secondaryMetrics: [
					{ label: 'Input characters', value: num(chars(input), 0) },
					{ label: 'Decoded bytes', value: num(decoded.bytes.length, 0) },
					{ label: 'Decoded characters', value: num(chars(text), 0) },
					{ label: 'Size change', value: `${change >= 0 ? '+' : '−'}${num(Math.abs(change), 1)}%` }
				]
			};
		}

		const text = String(v.plain);
		if (text === '') {
			return { primaryResult: DASH, primaryLabel: 'Base64 output', summary: 'Enter some text to encode.' };
		}
		const bytes = new TextEncoder().encode(text);
		const out = base64Encode(bytes, Boolean(v.urlSafe));
		const change = (out.length / bytes.length - 1) * 100;
		return {
			primaryResult: out,
			primaryLabel: v.urlSafe ? 'URL-safe Base64' : 'Base64',
			long: true,
			summary: `${plural(bytes.length, 'byte')} of UTF-8 became ${plural(out.length, 'character')} of Base64.`,
			secondaryMetrics: [
				{ label: 'Input characters', value: num(chars(text), 0) },
				{ label: 'Input bytes (UTF-8)', value: num(bytes.length, 0) },
				{ label: 'Output characters', value: num(out.length, 0) },
				{ label: 'Size change', value: `+${num(change, 1)}%` }
			]
		};
	},
	content: {
		intro:
			'This Base64 encoder and decoder turns text into a string of safe characters, and turns Base64 back into text. It is used to carry binary data through systems that only handle plain text, such as email and web addresses.',
		howTo: [
			'Choose Encode text, or Decode Base64.',
			'Paste your text, or the Base64 string, into the box. Line breaks in Base64 are ignored.',
			'For a web address or a token, tick the URL-safe alphabet to swap + and / for - and _.',
			'Read the output and the size change. Encoding makes the text about a third longer.'
		],
		about: [
			{
				heading: 'What is Base64?',
				paragraphs: [
					'Base64 is a way to write binary data using only 64 plain characters: the letters A to Z and a to z, the digits 0 to 9, and the symbols + and /. The name comes from those 64 symbols. Base64 is defined in RFC 4648.',
					'Some systems only handle text. Email, JSON and HTML can mangle raw bytes, such as an image or a binary key. Base64 turns those bytes into safe text, and turns the text back into the same bytes when it is decoded.',
					'Base64 is an encoding, not encryption or compression. Anyone can decode it, so it does not protect secrets. Its only job is to change the form of the data.'
				]
			},
			{
				heading: 'How the encoding works',
				paragraphs: [
					'Each character holds 6 bits, because 2 to the power of 6 is 64. The input is read in groups of 3 bytes, which is 24 bits. Those 24 bits are split into four 6-bit pieces, and each piece becomes one character.',
					'Because 3 bytes become 4 characters, the output is about 4 ÷ 3 times the input, or 33% longer. If the input is not a multiple of 3 bytes, the last group is padded with one or two = signs, so the output length is a multiple of 4.',
					'For text, the bytes come from UTF-8, so accented letters and emoji use more bytes than plain English letters. The calculator shows both the byte count and the character count.'
				],
				table: {
					caption: 'How input bytes map to output characters',
					columns: ['Input bytes', 'Base64 characters', 'Padding'],
					rows: [
						['3', '4', 'None'],
						['2', '4', 'One ='],
						['1', '4', 'Two =='],
						['13', '20', 'Two == (the last group is 1 byte)']
					]
				}
			},
			{
				heading: 'URL-safe Base64 and where it is used',
				paragraphs: [
					'The standard alphabet uses + and /, which have special meanings in web addresses. The URL-safe variant, described in RFC 4648, replaces them with - and _. It also usually leaves out the = padding, so the string fits cleanly into a link or a file name. Percent-encoding, a different scheme for URLs, is covered by the [URL encode and decode calculator](/url-encode-decode).',
					'Base64 appears in many places. Email attachments use it through MIME (RFC 2045), and web pages use it in data URIs (RFC 2397) to embed a small image inside a page. Authentication headers and JSON Web Tokens also use URL-safe Base64.',
					'If you need to check what a Base64 string contains, decode it here. For the number systems used beside it, the [binary calculator](/binary-calculator) and the [hex calculator](/hex-calculator) show how bits and digits are written.'
				]
			},
			{
				heading: 'Tips for using Base64 correctly',
				paragraphs: ['Base64 is simple, but a few mistakes come up often. Keep these points in mind:'],
				list: [
					'**Do not use it as security.** It is easy to decode, so protect secrets with proper encryption instead.',
					'**Expect the size increase.** Base64 adds about a third, which matters for large payloads.',
					'**Use the URL-safe form in links.** Standard + and / characters can break a URL.',
					'**Check the text encoding.** Decode with the same character set the text was encoded with, usually UTF-8.',
					'**Read the size change.** For file sizes in data transfer, the [bandwidth calculator](/bandwidth-calculator) shows the time needed.'
				]
			}
		],
		formulas: [
			{
				title: 'Output length',
				expression: 'characters = 4 × ⌈bytes ÷ 3⌉',
				variables: [{ symbol: '⌈ ⌉', meaning: 'round up to the next whole number' }]
			},
			{
				title: 'Size increase',
				expression: 'output ÷ input ≈ 4 ÷ 3 ≈ 1.333, so about 33% longer for long inputs',
				variables: []
			},
			{
				title: 'Bits per character',
				expression: '2⁶ = 64 symbols, so each character carries 6 bits',
				variables: [{ symbol: '6 bits', meaning: 'the information in one Base64 character' }]
			}
		],
		example: {
			title: 'Encoding “Hello, World!”',
			steps: [
				'Text to bytes: “Hello, World!” is 13 ASCII bytes.',
				'Groups: 13 bytes = four groups of 3 bytes (16 characters) plus 1 leftover byte (2 characters and ==).',
				'Total: 16 + 4 = 20 characters.'
			],
			result: 'SGVsbG8sIFdvcmxkIQ==, which is 20 characters, about 54% longer than the 13-byte input.'
		},
		faq: [
			{
				q: 'What is Base64 used for?',
				a: 'It carries binary data through text-only systems. Common uses include email attachments, data URIs in web pages, and tokens in authentication headers. It is an encoding, not a security measure.'
			},
			{
				q: 'Is Base64 encryption?',
				a: 'No. Base64 is reversible by anyone, with no key. To protect data, use encryption, and treat Base64 only as a way to store or send the encrypted bytes as text.'
			},
			{
				q: 'Why does Base64 end with = signs?',
				a: 'The = signs are padding. They fill the last group of four characters when the input is not a multiple of 3 bytes. The URL-safe form often leaves them out.'
			},
			{
				q: 'Why is my decoded text garbled?',
				a: 'The most common reason is the character set. Base64 stores bytes, and the text must be read as the right encoding, usually UTF-8. The string may also be corrupted or not Base64 at all.'
			},
			{
				q: 'How much bigger is Base64 than the original?',
				a: 'About one third bigger for long inputs. Every 3 bytes become 4 characters, so 300 bytes become about 400 characters.'
			}
		],
		sources: [
			{ title: 'RFC 4648: The Base16, Base32, and Base64 Data Encodings', url: 'https://www.rfc-editor.org/rfc/rfc4648' },
			{ title: 'MDN Web Docs: Base64 (glossary)', url: 'https://developer.mozilla.org/en-US/docs/Glossary/Base64' }
		]
	}
});
