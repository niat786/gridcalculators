import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './url-encode-decode.meta';

const chars = (s: string) => Array.from(s).length;
const escapes = (s: string) => (s.match(/%/g) ?? []).length;
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
				{ label: 'Encode', value: 'encode' },
				{ label: 'Decode', value: 'decode' }
			]
		},
		{
			id: 'method',
			label: 'Method',
			type: 'select',
			display: 'menu',
			default: 'component',
			options: [
				{ label: 'Query value (encodeURIComponent)', value: 'component' },
				{ label: 'Full URL (encodeURI)', value: 'url' }
			],
			help: 'Query value escapes everything except letters, digits and - _ . ! ~ * \' ( ). Full URL also keeps / ? & = # : @ + $ , ; (and encodes % as %25).'
		},
		{
			id: 'plain',
			label: 'Text to encode',
			type: 'text',
			default: 'https://example.com/search?q=café menu & tea',
			multiline: true,
			monospace: true,
			placeholder: 'Type or paste text or a URL',
			visibleWhen: (v: InputValues) => v.mode !== 'decode'
		},
		{
			id: 'encoded',
			label: 'Text to decode',
			type: 'text',
			default: 'https://example.com/search?q=caf%C3%A9%20menu%20%26%20tea',
			multiline: true,
			monospace: true,
			placeholder: 'Paste percent-encoded text',
			help: 'Full URL decoding leaves reserved escapes such as %2F or %26 in place.',
			visibleWhen: (v: InputValues) => v.mode === 'decode'
		}
	],
	calculate(v): CalculationResult {
		const useUrl = v.method === 'url';
		if (v.mode === 'decode') {
			const input = String(v.encoded);
			if (input === '') return { primaryResult: DASH, primaryLabel: 'Decoded text', summary: 'Paste some encoded text to decode.' };
			const decodeFn = useUrl ? decodeURI : decodeURIComponent;
			let text: string;
			try {
				text = decodeFn(input);
			} catch {
				return {
					primaryResult: DASH,
					primaryLabel: 'Decoded text',
					summary: 'A % must be followed by two hex digits (0–9, A–F), and multi-byte characters such as %C3%A9 need all their bytes.',
					secondaryMetrics: [
						{ label: 'Input characters', value: num(chars(input), 0) },
						{ label: 'Escape sequences (%XX)', value: num(escapes(input), 0) },
						{ label: 'Output characters', value: DASH },
						{ label: 'Output bytes (UTF-8)', value: DASH }
					]
				};
			}
			return {
				primaryResult: text,
				primaryLabel: 'Decoded text',
				long: true,
				summary: useUrl
					? 'Decoded with decodeURI. Escapes for reserved characters such as %2F or %26 stay encoded.'
					: 'Decoded with decodeURIComponent, so every escape becomes its character.',
				secondaryMetrics: [
					{ label: 'Input characters', value: num(chars(input), 0) },
					{ label: 'Escape sequences (%XX)', value: num(escapes(input), 0) },
					{ label: 'Output characters', value: num(chars(text), 0) },
					{ label: 'Output bytes (UTF-8)', value: num(utf8Bytes(text), 0) }
				]
			};
		}

		const text = String(v.plain);
		if (text === '') return { primaryResult: DASH, primaryLabel: 'Encoded text', summary: 'Enter some text to encode.' };
		const encodeFn = useUrl ? encodeURI : encodeURIComponent;
		let out: string;
		try {
			out = encodeFn(text);
		} catch {
			return {
				primaryResult: DASH,
				primaryLabel: 'Encoded text',
				summary: 'The text contains a broken character (half of a surrogate pair) that cannot be encoded.'
			};
		}
		return {
			primaryResult: out,
			primaryLabel: 'Encoded text',
			long: true,
			summary: useUrl
				? 'Encoded with encodeURI. Reserved characters such as / ? & = are kept, so the URL structure stays intact.'
				: 'Encoded with encodeURIComponent. Reserved characters such as / ? & = are escaped, so the value stays in one piece.',
			secondaryMetrics: [
				{ label: 'Input characters', value: num(chars(text), 0) },
				{ label: 'Input bytes (UTF-8)', value: num(utf8Bytes(text), 0) },
				{ label: 'Output characters', value: num(chars(out), 0) },
				{ label: 'Escape sequences (%XX)', value: num(escapes(out), 0) }
			]
		};
	},
	content: {
		intro:
			'This URL encoder and decoder converts text into percent-encoded form, so it can sit safely inside a web address, and turns %XX escapes back into readable text. Use the query value method for one parameter, and the full URL method for a whole address.',
		howTo: [
			'Choose Encode or Decode.',
			'Pick Query value to encode a single parameter, or Full URL to keep a whole address working.',
			'Paste your text and read the result. Letters outside basic English become several %XX bytes in UTF-8.',
			'Check the escape count in the metrics to see how many characters changed.'
		],
		about: [
			{
				heading: 'What is URL encoding?',
				paragraphs: [
					'A URL can only contain a limited set of characters. Letters, digits and a few symbols are allowed, but spaces, accents and some punctuation are not. Percent-encoding, also called URL encoding, replaces each unsafe character with a percent sign and its code.',
					'For example, a space becomes %20, and an ampersand becomes %26. The code is written in hexadecimal, a base-16 number system, so each byte uses two digits from 0 to 9 and A to F.',
					'RFC 3986 defines the generic syntax of URIs, including percent-encoding. Browsers and servers apply the same rules, so an encoded address means the same thing everywhere.'
				]
			},
			{
				heading: 'Reserved and unreserved characters',
				paragraphs: [
					'Unreserved characters are letters, digits, hyphen, dot, underscore and tilde. They never need encoding. Reserved characters, such as / ? & = # and :, have a job inside a URL, so they must be encoded when they appear as data.',
					'That difference explains the two methods in the calculator. The query value method escapes almost everything, so a value such as “tea & cake” cannot break the link. The full URL method keeps the structural characters, so the address still works after encoding.',
					'Non-English letters are handled through UTF-8. A letter such as é takes two bytes, C3 and A9, so it becomes %C3%A9. Each byte gets its own escape, which is why accented text makes longer output.'
				],
				table: {
					caption: 'Common characters and their escapes',
					columns: ['Character', 'Query value', 'Escape'],
					rows: [
						['Space', 'Encoded', '%20'],
						['&', 'Encoded', '%26'],
						['/', 'Encoded', '%2F'],
						['é', 'Encoded', '%C3%A9'],
						['-  _  .  ~', 'Not encoded', 'Kept as they are']
					]
				}
			},
			{
				heading: 'Encoding forms and the plus sign',
				paragraphs: [
					'HTML forms are a special case. When a form is sent with the GET or POST method and the default content type, spaces are often written as + rather than %20. That form encoding is described in the WHATWG URL standard, and it is not the same as the percent-encoding in RFC 3986.',
					'So a plus sign in a URL can mean a space or a literal plus, depending on where it appears. If you are unsure, encode a literal plus as %2B, which is unambiguous. This tool decodes + as a plus sign.',
					'Be careful when you decode user input. Decoding can produce characters such as < or quotes, so never insert decoded text into a web page without proper escaping. The [base64 encoder and decoder](/base64-encode-decode) follows a similar idea for binary data.'
				]
			},
			{
				heading: 'Tips for building URLs safely',
				paragraphs: ['Most URL bugs come from encoding the wrong part. These habits prevent them:'],
				list: [
					'**Encode each value separately.** Encode every parameter on its own, then join them with & and =.',
					'**Do not encode the whole address.** That would escape the : and / that keep the URL working.',
					'**Encode once.** Encoding a value twice turns %20 into %2520, which breaks the link.',
					'**Check the escapes.** Every % must be followed by exactly two hex digits.',
					'**Explore related tools.** The [developer tools](/developer-tools) section has calculators for other encodings, and the [hex calculator](/hex-calculator) explains the digits used in each escape.'
				]
			}
		],
		formulas: [
			{
				title: 'Percent encoding',
				expression: 'character → UTF-8 bytes → each byte written as %HH',
				variables: [
					{ symbol: '%HH', meaning: 'a byte written as a percent sign and two hexadecimal digits' },
					{ symbol: 'é', meaning: 'encodes to two bytes, C3 and A9, so it becomes %C3%A9' }
				]
			},
			{
				title: 'Output length',
				expression: 'escaped length = unreserved characters + 3 × escaped bytes',
				variables: [{ symbol: '3', meaning: 'each escaped byte takes three characters: the %, and two hex digits' }]
			}
		],
		example: {
			title: 'Encoding a search phrase as a query value',
			steps: [
				'Input: café menu & tea (é is two UTF-8 bytes).',
				'Space becomes %20, & becomes %26, and é becomes %C3%A9.',
				'Count the escapes: %C3, %A9, %20, %20, %26 and %20 make 6 sequences.'
			],
			result: 'caf%C3%A9%20menu%20%26%20tea'
		},
		faq: [
			{
				q: 'What is the difference between encodeURI and encodeURIComponent?',
				a: 'encodeURIComponent escapes everything except a few safe letters and symbols, so it suits one query value. encodeURI leaves structural characters such as / ? & = # alone, so it suits a complete URL.'
			},
			{
				q: 'Why does a space become %20 and sometimes +?',
				a: '%20 is the standard escape for a space. Some HTML form submissions use + for spaces instead. This tool keeps + as a literal plus sign when decoding, so check which convention your system uses.'
			},
			{
				q: 'Why did my decode fail?',
				a: 'A % must be followed by exactly two hex digits. Multi-byte characters also need all their bytes, so %C3 on its own is invalid. Fix the escape and try again.'
			},
			{
				q: 'Should I encode a whole URL?',
				a: 'Usually not. Encode each value on its own with the query value method, then join them into the URL. Encoding the whole URL would also escape the : and / that keep it working.'
			},
			{
				q: 'Is URL encoding the same as encryption?',
				a: 'No. Anyone can decode percent-encoded text, so it hides nothing. It only makes characters safe to place in a URL.'
			}
		],
		sources: [
			{ title: 'RFC 3986: Uniform Resource Identifier (URI): Generic Syntax', url: 'https://www.rfc-editor.org/rfc/rfc3986' },
			{ title: 'MDN Web Docs: encodeURIComponent()', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent' }
		]
	}
});
