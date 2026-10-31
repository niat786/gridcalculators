import { defineCalculator, type CalculationResult, type InputValues, type Table } from '../types';
import { DASH, num, pct } from '../format';
import meta from './molecular-weight-calculator.meta';

/**
 * Standard atomic weights, g/mol, from the IUPAC CIAAW abridged table (2024 table, based on the
 * 2021 report). Elements with no stable isotope use the mass number of the longest-lived isotope.
 */
const WEIGHTS: Record<string, number> = {
	H: 1.008, He: 4.0026, Li: 6.94, Be: 9.0122, B: 10.81, C: 12.011, N: 14.007, O: 15.999, F: 18.998, Ne: 20.18,
	Na: 22.99, Mg: 24.305, Al: 26.982, Si: 28.085, P: 30.974, S: 32.06, Cl: 35.45, Ar: 39.95, K: 39.098, Ca: 40.078,
	Sc: 44.956, Ti: 47.867, V: 50.942, Cr: 51.996, Mn: 54.938, Fe: 55.845, Co: 58.933, Ni: 58.693, Cu: 63.546, Zn: 65.38,
	Ga: 69.723, Ge: 72.63, As: 74.922, Se: 78.971, Br: 79.904, Kr: 83.798, Rb: 85.468, Sr: 87.62, Y: 88.906, Zr: 91.222,
	Nb: 92.906, Mo: 95.95, Tc: 98, Ru: 101.07, Rh: 102.91, Pd: 106.42, Ag: 107.87, Cd: 112.41, In: 114.82, Sn: 118.71,
	Sb: 121.76, Te: 127.6, I: 126.9, Xe: 131.29, Cs: 132.91, Ba: 137.33, La: 138.91, Ce: 140.12, Pr: 140.91, Nd: 144.24,
	Pm: 145, Sm: 150.36, Eu: 151.96, Gd: 157.25, Tb: 158.93, Dy: 162.5, Ho: 164.93, Er: 167.26, Tm: 168.93, Yb: 173.05,
	Lu: 174.97, Hf: 178.49, Ta: 180.95, W: 183.84, Re: 186.21, Os: 190.23, Ir: 192.22, Pt: 195.08, Au: 196.97, Hg: 200.59,
	Tl: 204.38, Pb: 207.2, Bi: 208.98, Po: 209, At: 210, Rn: 222, Fr: 223, Ra: 226, Ac: 227, Th: 232.04,
	Pa: 231.04, U: 238.03
};

type Counts = Map<string, number>;

const addTo = (target: Counts, symbol: string, n: number) => target.set(symbol, (target.get(symbol) ?? 0) + n);

const SUBSCRIPT = '₀₁₂₃₄₅₆₇₈₉';
const CLOSER: Record<string, string> = { '(': ')', '[': ']', '{': '}' };

/** Parses one formula body (no hydrate dots) with nested brackets. Returns the atom counts or an error. */
function parseBody(s: string): Counts | string {
	const stack: { counts: Counts; closer: string }[] = [{ counts: new Map(), closer: '' }];
	let i = 0;
	const readCount = (): number => {
		let j = i;
		while (j < s.length && s[j] >= '0' && s[j] <= '9') j++;
		const n = j > i ? Number(s.slice(i, j)) : 1;
		i = j;
		return n;
	};
	while (i < s.length) {
		const ch = s[i];
		const top = stack[stack.length - 1].counts;
		if (ch >= 'A' && ch <= 'Z') {
			let symbol = ch;
			i++;
			if (i < s.length && s[i] >= 'a' && s[i] <= 'z') {
				symbol += s[i];
				i++;
			}
			if (!(symbol in WEIGHTS)) return `“${symbol}” is not an element symbol I know. Check the capital and lower-case letters.`;
			addTo(top, symbol, readCount());
		} else if (ch in CLOSER) {
			stack.push({ counts: new Map(), closer: CLOSER[ch] });
			i++;
		} else if (ch === ')' || ch === ']' || ch === '}') {
			const open = stack.pop();
			if (!open || stack.length === 0 || open.closer !== ch) return `The bracket “${ch}” does not match the bracket before it.`;
			i++;
			const n = readCount();
			for (const [symbol, count] of open.counts) addTo(stack[stack.length - 1].counts, symbol, count * n);
		} else if (ch >= 'a' && ch <= 'z') {
			return `Element symbols start with a capital letter, so “${ch}” should be “${ch.toUpperCase()}”.`;
		} else {
			return `The character “${ch}” cannot be used in a formula.`;
		}
	}
	if (stack.length !== 1) return 'A bracket is opened but never closed.';
	return stack[0].counts;
}

/** Parses a formula with optional hydrate parts, e.g. "CuSO4·5H2O", "CuSO4*5H2O" or "CuSO4.5H2O". */
function parseFormula(raw: string): Counts | string {
	const cleaned = raw
		.trim()
		.replace(/[₀-₉]/g, (d) => String(SUBSCRIPT.indexOf(d)))
		.replace(/\s+/g, '');
	if (cleaned === '') return 'Enter a chemical formula, such as H2O or CuSO4·5H2O.';
	const total: Counts = new Map();
	for (const part of cleaned.split(/[·*•⋅.]/)) {
		if (part === '') return 'A hydrate part is missing between the separators. Check the “·” or “*” before the water.';
		const lead = /^(\d+)(?=[A-Z(\[{])/.exec(part);
		const multiplier = lead ? Number(lead[1]) : 1;
		const body = lead ? part.slice(lead[1].length) : part;
		const counts = parseBody(body);
		if (typeof counts === 'string') return counts;
		for (const [symbol, n] of counts) addTo(total, symbol, n * multiplier);
	}
	return total;
}

/** Hill order: carbon first, then hydrogen, then everything else A to Z. Without carbon, everything A to Z. */
function hillOrder(symbols: string[]): string[] {
	const rest = symbols.filter((s) => s !== 'C' && s !== 'H').sort();
	if (!symbols.includes('C')) return symbols.slice().sort();
	return ['C', ...(symbols.includes('H') ? ['H'] : []), ...rest];
}

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'formula',
			label: 'Chemical formula',
			type: 'text',
			default: 'C6H12O6',
			monospace: true,
			maxLength: 200,
			placeholder: 'e.g. Ca(OH)2 or CuSO4·5H2O',
			help: 'Use capital letters for elements, and brackets for groups. Write hydrate water after · or *.'
		}
	],
	calculate(v: InputValues): CalculationResult {
		const label = 'Molar mass';
		const parsed = parseFormula(String(v.formula));
		if (typeof parsed === 'string') return { primaryResult: DASH, primaryLabel: label, summary: parsed };

		const symbols = hillOrder([...parsed.keys()]);
		const molar = symbols.reduce((acc, s) => acc + (parsed.get(s) ?? 0) * WEIGHTS[s], 0);
		const atoms = symbols.reduce((acc, s) => acc + (parsed.get(s) ?? 0), 0);
		const shares = symbols.map((s) => ({ s, mass: (parsed.get(s) ?? 0) * WEIGHTS[s] }));
		const heaviest = shares.reduce((best, cur) => (cur.mass > best.mass ? cur : best));

		const table: Table = {
			title: 'Composition by element',
			columns: [
				{ key: 'element', label: 'Element' },
				{ key: 'count', label: 'Count', align: 'end' },
				{ key: 'mass', label: 'Atomic mass', align: 'end' },
				{ key: 'percent', label: 'Mass %', align: 'end' }
			],
			rows: shares.map(({ s, mass }) => ({
				element: s,
				count: num(parsed.get(s) ?? 0, 0),
				mass: num(WEIGHTS[s], 4),
				percent: pct((mass / molar) * 100, 2)
			}))
		};

		return {
			primaryResult: `${num(molar, 3)} g/mol`,
			primaryLabel: label,
			summary: 'Each element’s count times its standard atomic weight, added together. Atomic weights are IUPAC CIAAW values.',
			secondaryMetrics: [
				{ label: 'Distinct elements', value: num(symbols.length, 0) },
				{ label: 'Atoms per formula unit', value: num(atoms, 0) },
				{ label: 'Largest mass share', value: `${heaviest.s} (${pct((heaviest.mass / molar) * 100, 1)})` }
			],
			table
		};
	},
	content: {
		intro:
			'Find the molar mass of a compound from its chemical formula. Type a formula such as H2O, C6H12O6 or CuSO4·5H2O, and the molecular weight calculator gives the total in g/mol with the mass share of each element.',
		howTo: [
			'Type the chemical formula, using capital letters for elements, such as NaCl or Ca(OH)2.',
			'Write hydrate water after a · or * separator, such as CuSO4·5H2O.',
			'Read the molar mass in grams per mole, then check the element table below it.',
			'Use the mass share of each element to see which one dominates the compound.'
		],
		about: [
			{
				heading: 'What is molecular weight?',
				paragraphs: [
					'Molecular weight, or molar mass, is the mass of one mole of a compound. It is measured in grams per mole (g/mol). The name molecular weight is still common, even though the value is a mass, not a weight.',
					'A molecule of water, H2O, contains two hydrogen atoms and one oxygen atom. Its molar mass is about 18.015 g/mol, because the two hydrogens add 2.016 and the oxygen adds 15.999.'
				]
			},
			{
				heading: 'Where the atomic weights come from',
				paragraphs: [
					'Each element has a standard atomic weight, which is the average mass of its atoms in nature. The values in this calculator come from the IUPAC Commission on Isotopic Abundances and Atomic Weights (CIAAW), which publishes them for chemists worldwide.',
					'Elements with no stable isotope use the mass of their longest-lived isotope, so their values are less certain. For most school and lab work, the figures are accurate enough.'
				]
			},
			{
				heading: 'Reading the formula',
				paragraphs: [
					'A number after an element counts its atoms. A number after a bracket applies to the whole group, so Ca(OH)2 has one calcium, two oxygens and two hydrogens. Hydrate water in a formula, such as CuSO4·5H2O, adds five water molecules to each unit.',
					'Element symbols use one capital letter, with an optional lower-case letter. So Co is cobalt, while CO is carbon with oxygen. Check the case of each letter, because it changes the meaning.'
				]
			},
			{
				heading: 'Using molar mass in practice',
				paragraphs: [
					'Molar mass links grams to moles. To find moles from a mass, divide the mass by the molar mass. The [molarity calculator](/molarity-calculator) uses this step when you prepare a solution. The [mass calculator](/mass-calculator) and [density calculator](/density-calculator) cover the physical side of the same idea.',
					'Molar mass also helps when you compare the mass of an element in two compounds. The mass share table shows the percentage of each element by weight, which is useful for checking a formula or a purity figure.'
				],
				list: [
					'Use the formula printed on the label, including any water of hydration.',
					'Check the molar mass against a reference such as the NIST Chemistry WebBook.',
					'Keep track of isotopes, which only matter for very precise work.',
					'Use enough decimal places for your work, and round at the end.'
				]
			},
			{
				heading: 'Chemical safety',
				paragraphs: [
					'Many compounds are hazardous, and a formula does not show that. Read the safety data sheet before you handle any substance, and store chemicals in labelled containers away from food.',
					'Never mix chemicals to see what happens, and do not use household products for lab work without checking their hazards first.'
				]
			}
		],
		formulas: [
			{
				title: 'Molar mass',
				expression: 'Molar mass = Σ (count of each element × atomic weight)',
				variables: [
					{ symbol: 'Σ', meaning: 'the sum over every element in the formula' },
					{ symbol: 'count', meaning: 'the number of atoms of that element, including those inside brackets' },
					{ symbol: 'atomic weight', meaning: 'the standard atomic weight of the element, in g/mol' }
				]
			},
			{
				title: 'Mass share of an element',
				expression: 'Mass % = (count × atomic weight) ÷ molar mass × 100',
				variables: [{ symbol: 'Mass %', meaning: 'the share of the compound’s mass that comes from that element' }]
			}
		],
		example: {
			title: 'Glucose, C6H12O6',
			steps: [
				'Carbon: 6 × 12.011 = 72.066 g/mol',
				'Hydrogen: 12 × 1.008 = 12.096 g/mol',
				'Oxygen: 6 × 15.999 = 95.994 g/mol',
				'Total: 72.066 + 12.096 + 95.994 = 180.156 g/mol'
			],
			result: 'The molar mass of glucose is 180.156 g/mol. Carbon makes up about 40% of the mass.'
		},
		faq: [
			{
				q: 'How do I calculate molecular weight?',
				a: 'Count the atoms of each element in the formula, multiply each count by its atomic weight, then add the results. The calculator does this for any formula you type.'
			},
			{
				q: 'What is the molecular weight of water?',
				a: 'About 18.015 g/mol. Two hydrogen atoms give about 2.016, and one oxygen atom gives 15.999.'
			},
			{
				q: 'What does the dot in CuSO4·5H2O mean?',
				a: 'It separates the water of hydration from the main compound. The five water molecules are part of the crystal, so their mass counts in the molar mass.'
			},
			{
				q: 'Why are some atomic weights not whole numbers?',
				a: 'Atomic weights are averages of the isotopes an element has in nature. So they are rarely whole numbers, even though the mass of one atom is close to its mass number.'
			}
		],
		sources: [
			{ title: 'IUPAC CIAAW, standard atomic weights', url: 'https://ciaaw.org/' },
			{ title: 'NIST Chemistry WebBook', url: 'https://webbook.nist.gov/chemistry/' }
		]
	}
});
