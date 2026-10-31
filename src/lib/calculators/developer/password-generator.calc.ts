import { defineCalculator } from '../types';
import meta from './password-generator.meta';

export default defineCalculator({
	meta,
	widget: { name: 'password' },
	inputs: [],
	calculate: () => ({ primaryResult: '', primaryLabel: '' }),
	content: {
		intro:
			'This password generator makes a strong, random password in one click. It runs in your browser, using cryptographically secure randomness, and the password is never sent to a server or stored by the page.',
		howTo: [
			'Choose a length with the slider. It goes from 8 to 64 characters, and 16 is the default.',
			'Tick the character types to include: uppercase, lowercase, numbers and symbols. Optionally, avoid look-alike characters.',
			'Copy the password with the button, or press New for another one. The strength bar updates as you change the settings.',
			'Save it in a password manager, rather than in a note or reused across sites.'
		],
		about: [
			{
				heading: 'How this generator works',
				paragraphs: [
					'The generator picks each character with the browser’s crypto.getRandomValues function, which the Web Crypto API provides. It does not use Math.random, which is predictable and not suitable for passwords. Each pick is also unbiased, so no character is favoured.',
					'First, the generator takes at least one character from every set you chose, so the password always meets your selection. It then fills the rest from the full pool of characters and shuffles the result, so the required characters do not sit in a fixed position.',
					'Also, the password is created when the page loads and whenever you change a setting. It is shown on your screen only. The page does not save it or send it anywhere.'
				]
			},
			{
				heading: 'Length, character sets and look-alikes',
				paragraphs: [
					'Length matters more than any other single choice. For example, length does far more than adding one symbol. Each extra character multiplies the number of possible passwords by the size of the pool. Adding one more character from a pool of 87 symbols multiplies the count by 87. For very large counts, the [big number calculator](/big-number-calculator) keeps every digit exact.',
					'For example, the four sets are uppercase letters (26), lowercase letters (26), digits (10) and 25 common symbols. The strength figure is the length times the base-2 logarithm of the pool size. This gives the bits of entropy, a measure of how many guesses an attacker might need in theory. To turn a count into odds, use the [probability calculator](/probability-calculator).',
					'The look-alike option, for instance, removes characters that are easy to confuse when you type or read a password. These include I, l, 1, O, 0 and o. It makes the password easier to copy by hand, but it slightly reduces the pool.'
				],
				table: {
					caption: 'Strength readout bands in this generator',
					columns: ['Entropy (bits)', 'Label shown'],
					rows: [
						['Below 50', 'Weak'],
						['50 to 74', 'Fair'],
						['75 to 99', 'Strong'],
						['100 or more', 'Very strong']
					]
				}
			},
			{
				heading: 'What good password advice looks like now',
				paragraphs: [
					'Security agencies and standards bodies, for example, now favour long, unique passwords over complicated rules. The US National Institute of Standards and Technology (NIST) covers this in its digital identity guidelines, SP 800-63B, which is the place to read the full rules.',
					'Many experts also suggest checking new passwords against lists of breached passwords, and allowing long passphrases. Forced changes on a fixed schedule are now widely seen as less useful than a unique password that is changed after a breach. Rules such as mandatory symbols often lead people to predictable patterns.',
					'Where a site offers passkeys or a second factor, however, use it as well. A password on its own is weaker than a password combined with a second check.'
				]
			},
			{
				heading: 'Tips for keeping passwords safe',
				paragraphs: ['A strong password only helps if you keep it safe. These habits matter most:'],
				list: [
					'**Use a unique password for every account.** A breach on one site should not give access to the others.',
					'**Store passwords in a password manager.** It creates and fills passwords, so you need to remember only one master password.',
					'**Turn on two-factor authentication.** Use an app or a security key for accounts that hold money or personal data.',
					'**Check for breaches.** Services such as Have I Been Pwned show whether your email appeared in known leaks.',
					'**Count the possibilities.** The [permutation and combination calculator](/permutation-and-combination-calculator) shows how fast the number of options grows with length.'
				]
			}
		],
		formulas: [
			{
				title: 'Possible passwords',
				expression: 'possibilities = pool ^ length',
				variables: [
					{ symbol: 'pool', meaning: 'the number of different characters the generator can pick from' },
					{ symbol: 'length', meaning: 'the number of characters in the password' }
				]
			},
			{
				title: 'Entropy (the readout)',
				expression: 'bits = floor(length × log₂(pool))',
				variables: [{ symbol: 'log₂', meaning: 'the base-2 logarithm, which counts how many bits a number needs' }]
			}
		],
		example: {
			title: 'A 16-character password using all four character types',
			steps: [
				'Possible characters: 26 + 26 + 10 + 25 symbols = 87.',
				'log₂(87) ≈ 6.4429 bits per character.',
				'16 × 6.4429 ≈ 103.09, which the readout rounds down to 103 bits.'
			],
			result: 'About 103 bits of entropy, which the readout labels Very strong. The number of possible passwords is 87 to the power 16, a very large figure.'
		},
		faq: [
			{
				q: 'Is it safe to generate a password on a website?',
				a: 'Here, yes. The password is made in your browser with the Web Crypto API and is never sent to a server. It is not saved, logged or added to the page address. Check any other generator for the same behaviour.'
			},
			{
				q: 'How long should my password be?',
				a: 'Length is the strongest lever you have. This generator defaults to 16 characters, which is a sensible minimum for important accounts, and longer is better where a site allows it.'
			},
			{
				q: 'Should I use a different password for every account?',
				a: 'Yes. Reusing passwords lets one data breach expose your other accounts. A password manager makes unique passwords easy to keep.'
			},
			{
				q: 'Are symbols and mixed case required?',
				a: 'Not necessarily. Length does more than forced complexity. Symbols can help, but a long random password with fewer character types is often stronger than a short one with many.'
			},
			{
				q: 'Does the entropy number mean my password cannot be cracked?',
				a: 'No. Entropy measures the size of the search space, which assumes the password is truly random and never leaked. Real attacks use stolen passwords, phishing and weak storage, so use two-factor authentication too.'
			}
		],
		sources: [
			{ title: 'NIST SP 800-63B: Digital Identity Guidelines (authentication)', url: 'https://csrc.nist.gov/pubs/sp/800/63/b/4/final' },
			{ title: 'MDN Web Docs: Crypto.getRandomValues()', url: 'https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues' }
		]
	}
});
