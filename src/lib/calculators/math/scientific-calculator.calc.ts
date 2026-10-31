import { defineCalculator } from '../types';
import meta from './scientific-calculator.meta';

export default defineCalculator({
	meta,
	widget: { name: 'keypad', props: { mode: 'scientific' } },
	inputs: [],
	calculate: () => ({ primaryResult: '', primaryLabel: '' }),
	content: {
		intro:
			'A free online scientific calculator for trigonometry, logarithms, powers, roots, factorials and constants such as π and e. Switch between degrees and radians, and see the answer as you type.',
		howTo: [
			'Choose DEG or RAD for angles, using the button at the top right. Use DEG for most school work.',
			'Tap a function such as sin or √. It types the function name and an opening bracket, so type the value next.',
			'Use xʸ for powers, x² for squares, x! for factorials and Ans to reuse your last answer.',
			'Press = or Enter to calculate. Missing closing brackets at the end are added for you.'
		],
		about: [
			{
				heading: 'What the scientific keys do',
				paragraphs: [
					'The scientific keys sit beside the number pad on wide screens, and above it on phones. Each key adds a symbol to your sum, so you can read the whole calculation before you press equals.',
					'Some keys add a whole function, such as sin( or ln(. Others add a short symbol. For example, xʸ adds a power sign, x² adds ^2, and 1/x adds a power of −1. The keys π and e add two constants, about 3.14159 and 2.71828.',
					'The **2nd** key switches some keys to a second function for one press, like SHIFT on a desk calculator. For example, sin becomes sin⁻¹, ln becomes eˣ, log becomes 10ˣ, x² becomes x³ and √x becomes ∛x.',
					'The ⌫ key removes a whole function name if you press it after one. So one press after sin( removes all of sin( at once.'
				]
			},
			{
				heading: 'Degrees or radians',
				paragraphs: [
					'Angles can be measured in degrees (DEG) or radians (RAD). A full turn is 360 degrees, or 2π radians. Most school trigonometry uses degrees, and this calculator starts in DEG each time you open the page.',
					'The mode matters a lot. In DEG mode, sin(30) is 0.5. In RAD mode, the same key reads 30 as 30 radians, which gives −0.98803. Always check the DEG or RAD button before you read a trig answer.',
					'To change from degrees to radians by hand, multiply by π and divide by 180. For example, 90 degrees is 90 × π ÷ 180, which is π ÷ 2, or about 1.5708 radians.'
				]
			},
			{
				heading: 'Sine, cosine and tangent',
				paragraphs: [
					'In a right-angled triangle, the sides have names. The hypotenuse is the longest side, opposite the right angle. The opposite and adjacent sides are next to the angle you care about.',
					'Sine is the opposite side divided by the hypotenuse. Cosine is the adjacent side divided by the hypotenuse. Tangent is the opposite side divided by the adjacent side. Many people remember these as SOH, CAH and TOA.',
					'The table shows the main values in DEG mode. Values are rounded to three decimal places.'
				],
				table: {
					caption: 'Common angles in degrees',
					columns: ['Angle', 'sin', 'cos', 'tan'],
					rows: [
						['0°', '0', '1', '0'],
						['30°', '0.5', '0.866', '0.577'],
						['45°', '0.707', '0.707', '1'],
						['60°', '0.866', '0.5', '1.732'],
						['90°', '1', '0', 'undefined']
					]
				}
			},
			{
				heading: 'Inverse trig, logs, powers and factorials',
				paragraphs: [
					'The inverse keys sin⁻¹, cos⁻¹ and tan⁻¹ (press 2nd first) work backwards. If sin(30°) is 0.5, then sin⁻¹(0.5) is 30°. Use them when you know the ratio and need the angle.',
					'A logarithm asks what power gives a number. The key log uses base 10, so log(1000) = 3, because 10 × 10 × 10 = 1,000. The key ln uses base e, about 2.71828, so ln(e) = 1. Logs are used for scales such as pH and decibels.',
					'For a power, type the base, tap xʸ, then the exponent. For example, 2 xʸ 10 gives 1,024. For the cube root of 27, tap 2nd, then ∛x, and type 27, which gives 3.',
					'A factorial, written n!, multiplies a whole number by every whole number below it. So 5! is 5 × 4 × 3 × 2 × 1 = 120, and 0! is 1 by definition. Factorials count arrangements, so four books can be lined up in 4! = 24 different orders. The calculator can only handle up to 170!. Larger answers show ∞.'
				],
				list: [
					'For more powers and roots, try the [exponent calculator](/exponent-calculator) and the [root calculator](/root-calculator).',
					'For log bases other than 10 or e, use the [log calculator](/log-calculator).'
				]
			},
			{
				heading: 'More functions: nCr, nPr, mod, EE and hyperbolic keys',
				paragraphs: [
					'The **nCr** key counts combinations, and **nPr** counts arrangements. For example, 5 nCr 2 gives 10, because there are 10 ways to pick 2 items from 5. For more on this, see the [permutation and combination calculator](/permutation-and-combination-calculator).',
					'The **mod** key gives the remainder after division, so 17 mod 5 is 2. Next, **EE** enters a power of ten: 2 EE 3 means 2 × 10³, which is 2,000. That makes very large or small numbers easy to type.',
					'Finally, sinh, cosh and tanh are the hyperbolic functions used in engineering and physics. Press 2nd for their inverses. **Rand** adds a random number between 0 and 1.'
				]
			},
			{
				heading: 'Order of operations',
				paragraphs: [
					'The calculator uses the same order as the [basic calculator](/basic-calculator). Brackets come first, then powers, then multiplication and division, then addition and subtraction. Powers are worked out from right to left.',
					'So 3 + 4^2 is 3 + 16 = 19, not 49. And 2^3^2 is 2^9 = 512, not 64. A minus sign in front of a power is worked out after the power, so −2^2 is −4, but (−2)^2 is 4.',
					'Typing a number next to a bracket or constant means multiplication. For example, 2sin(30) is 2 × 0.5 = 1, and 2π is about 6.28319.',
					'One mistake catches most people: a minus sign in front of a power is worked out after the power. So −3^2 is −9, but (−3)^2 is 9. Also, numbers next to a constant multiply, so 2, e, 3 gives 2 × e × 3, about 16.31.'
				]
			},
		],
		formulas: [
			{
				title: 'Degrees and radians',
				expression: 'radians = degrees × π ÷ 180',
				variables: [{ symbol: 'π', meaning: 'about 3.14159' }]
			},
			{
				title: 'Logarithms',
				expression: 'log(x) = log₁₀(x)     ln(x) = logₑ(x)     logₐ(x) = ln(x) ÷ ln(a)',
				variables: [
					{ symbol: 'log', meaning: 'the base-10 logarithm, the power of 10 that gives x' },
					{ symbol: 'ln', meaning: 'the natural logarithm, the power of e that gives x' }
				]
			},
			{
				title: 'Factorial',
				expression: 'n! = n × (n − 1) × … × 2 × 1,   0! = 1',
				variables: [{ symbol: 'n', meaning: 'a whole number, 0 or more' }]
			},
			{
				title: 'Right-angled triangle',
				expression: 'sin θ = opposite ÷ hypotenuse,   cos θ = adjacent ÷ hypotenuse,   tan θ = opposite ÷ adjacent',
				variables: [{ symbol: 'θ', meaning: 'the angle you are looking at' }]
			}
		],
		example: {
			title: 'Find the height of a ramp 10 m long at 30°',
			steps: [
				'Height = length × sin(angle), because sine links the opposite side with the hypotenuse.',
				'Make sure the angle mode is DEG.',
				'Type 10 × sin(30) = 10 × 0.5 = 5.'
			],
			result: 'The ramp rises 5 m.'
		},
		faq: [
			{
				q: 'Why does sin(30) give a strange answer?',
				a: 'Check the angle mode. In DEG mode, sin(30) is 0.5. In RAD mode, the 30 is read as 30 radians, which gives about −0.988. Switch to DEG for angles in degrees.'
			},
			{
				q: 'What is the difference between log and ln?',
				a: 'log is the base-10 logarithm, so log(100) = 2. ln is the natural logarithm, base e, which is about 2.71828. So ln(e) = 1.'
			},
			{
				q: 'How do I calculate a cube or any power?',
				a: 'Type the base, tap xʸ, then type the exponent. For example, 2 xʸ 10 gives 1,024, and 3 xʸ 3 gives 27. For squares, tap x².'
			},
			{
				q: 'What is the largest factorial it can calculate?',
				a: '170! is the largest factorial this calculator can show, about 7.26 × 10³⁰⁶. Larger factorials show ∞.'
			},
			{
				q: 'Can I type sin or π on my keyboard?',
				a: 'No. The keyboard handles digits, brackets, + − * / ^ % and !. Use the on-screen keys for functions, π and e, and press Enter to calculate.'
			}
		],
		sources: [
			{ title: 'Wikipedia — Trigonometric functions', url: 'https://en.wikipedia.org/wiki/Trigonometric_functions' },
			{ title: 'Wikipedia — Logarithm', url: 'https://en.wikipedia.org/wiki/Logarithm' },
			{ title: 'Wikipedia — Factorial', url: 'https://en.wikipedia.org/wiki/Factorial' }
		]
	}
});
