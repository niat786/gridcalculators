import { defineCalculator, type CalculationResult } from '../types';
import { DASH, num } from '../format';
import meta from './gfr-calculator.meta';

/** CKD-EPI 2021 creatinine equation (race-free), Inker et al., NEJM 2021. Scr in mg/dL. */
export function ckdEpi2021(scr: number, age: number, female: boolean): number {
	const k = female ? 0.7 : 0.9;
	const a = female ? -0.241 : -0.302;
	return 142 * Math.min(scr / k, 1) ** a * Math.max(scr / k, 1) ** -1.2 * 0.9938 ** age * (female ? 1.012 : 1);
}

/** KDIGO GFR categories. */
export function gfrStage(gfr: number): { stage: string; text: string } {
	if (gfr >= 90) return { stage: 'G1', text: 'Normal or high' };
	if (gfr >= 60) return { stage: 'G2', text: 'Mildly decreased' };
	if (gfr >= 45) return { stage: 'G3a', text: 'Mildly to moderately decreased' };
	if (gfr >= 30) return { stage: 'G3b', text: 'Moderately to severely decreased' };
	if (gfr >= 15) return { stage: 'G4', text: 'Severely decreased' };
	return { stage: 'G5', text: 'Kidney failure range' };
}

const UMOL_PER_MGDL = 88.4;

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'scr', label: 'Serum creatinine', type: 'number', default: 1.0, min: 0.1, max: 2000, step: 0.01 },
		{
			id: 'unit',
			label: 'Creatinine unit',
			type: 'select',
			display: 'segmented',
			default: 'mgdl',
			options: [
				{ label: 'mg/dL (US)', value: 'mgdl' },
				{ label: 'µmol/L (UK, EU, Canada…)', value: 'umol' }
			]
		},
		{ id: 'age', label: 'Age', type: 'number', default: 50, min: 18, max: 120, decimal: false, suffix: 'years', width: 'half' },
		{
			id: 'sex',
			label: 'Sex',
			type: 'select',
			display: 'segmented',
			default: 'male',
			width: 'half',
			options: [
				{ label: 'Male', value: 'male' },
				{ label: 'Female', value: 'female' }
			]
		}
	],
	calculate(v): CalculationResult {
		const raw = Number(v.scr);
		const age = Number(v.age);
		const scr = v.unit === 'umol' ? raw / UMOL_PER_MGDL : raw;
		if (!(scr > 0) || !Number.isFinite(age) || age < 18) {
			return { primaryResult: DASH, primaryLabel: 'Estimated GFR', summary: 'This equation is for adults 18 and over.' };
		}
		if (scr > 25) {
			return { primaryResult: DASH, primaryLabel: 'Estimated GFR', summary: 'Check the value and the unit: µmol/L values are about 88 times larger than mg/dL.' };
		}
		const gfr = ckdEpi2021(scr, age, v.sex === 'female');
		const { stage, text } = gfrStage(gfr);
		return {
			primaryResult: `${num(Math.round(gfr), 0)} mL/min/1.73 m²`,
			primaryLabel: 'Estimated GFR',
			summary: `Stage ${stage}: ${text.toLowerCase()}. ${gfr < 60 ? 'A value below 60 for three months or more suggests chronic kidney disease — discuss it with your doctor.' : 'One result can’t diagnose kidney disease; doctors also look at urine albumin and repeat tests.'}`,
			secondaryMetrics: [
				{ label: 'GFR category (KDIGO)', value: `${stage} · ${text}` },
				{ label: 'Creatinine in mg/dL', value: num(scr, 2) },
				{ label: 'Creatinine in µmol/L', value: num(scr * UMOL_PER_MGDL, 0) }
			],
			gauge: {
				min: 0,
				max: 120,
				value: Math.min(120, gfr),
				bands: [
					{ to: 15, label: 'G5' },
					{ to: 30, label: 'G4' },
					{ to: 45, label: 'G3b' },
					{ to: 60, label: 'G3a' },
					{ to: 90, label: 'G2' },
					{ to: 120, label: 'G1' }
				]
			}
		};
	},
	content: {
		intro:
			'Use this GFR calculator to estimate your glomerular filtration rate (eGFR), a standard measure of kidney function, from a blood creatinine result. It uses the race-free CKD-EPI 2021 equation recommended by the US National Kidney Foundation and the American Society of Nephrology.',
		howTo: [
			'Enter your serum creatinine from your blood test report.',
			'Pick the unit on the report: mg/dL in the US, µmol/L in most other countries.',
			'Enter your age and sex.',
			'Read your eGFR and the KDIGO category, then talk through the result with your doctor.'
		],
		about: [
			{
				heading: 'What is GFR?',
				paragraphs: [
					'Your kidneys filter waste from your blood. The glomerular filtration rate (GFR) describes how much blood they filter each minute. Measuring it directly is difficult, so doctors estimate it from a blood test. The estimate is called eGFR.',
					'The blood test measures creatinine, a waste product from muscle. When the kidneys work less well, creatinine builds up in the blood. The equation turns your creatinine, age and sex into an eGFR in mL/min/1.73 m². The 1.73 m² is a standard adult body size, so results can be compared between people.'
				]
			},
			{
				heading: 'How to read your eGFR',
				paragraphs: [
					'The KDIGO guideline groups eGFR into six categories, from G1 to G5. These are the categories this calculator shows.'
				],
				table: {
					caption: 'GFR categories (KDIGO)',
					columns: ['Category', 'eGFR (mL/min/1.73 m²)', 'Description'],
					rows: [
						['G1', '90 or above', 'Normal or high'],
						['G2', '60 to 89', 'Mildly decreased'],
						['G3a', '45 to 59', 'Mildly to moderately decreased'],
						['G3b', '30 to 44', 'Moderately to severely decreased'],
						['G4', '15 to 29', 'Severely decreased'],
						['G5', 'Below 15', 'Kidney failure range']
					]
				}
			},
			{
				heading: 'What a result does and does not mean',
				paragraphs: [
					'A single eGFR cannot diagnose kidney disease. The National Kidney Foundation says an eGFR below 60 for three months or more points to chronic kidney disease (CKD). Doctors also check urine, often for albumin, and repeat tests over time.',
					'eGFR normally falls with age. The National Kidney Foundation notes that a low eGFR in an older person does not always mean CKD. A result in the G2 range can be normal for some people, especially if there are no other signs of kidney damage.',
					'Early kidney disease often causes no symptoms, so regular checks matter for people with risk factors such as diabetes or high blood pressure. If your result is below 60, or if your doctor has asked for follow-up, please book a visit.'
				]
			},
			{
				heading: 'When the estimate is less reliable',
				paragraphs: [
					'The equation assumes typical muscle mass. It can be off in people with very high or very low muscle mass, amputations, or a very different diet. It also does not apply during pregnancy, acute illness that changes the kidneys quickly, or in children.',
					'In these cases, doctors may use a cystatin C blood test, which does not depend on muscle in the same way. The NKF and ASN task force recommended using cystatin C together with creatinine to confirm results when needed.'
				]
			},
			{
				heading: 'Why there is no race question',
				paragraphs: [
					'Older equations included a race coefficient. In 2021, the NKF and ASN task force recommended the new CKD-EPI 2021 creatinine equation, which estimates kidney function without a race variable. This calculator uses that equation for all adults.',
					'Kidney health is linked to other health measures. You can look at your weight with the [BMI calculator](/bmi-calculator) and your body surface area with the [body surface area calculator](/body-surface-area-calculator). Your doctor will advise on blood pressure, diabetes and diet. If you have reduced kidney function, ask before changing how much protein you eat, and see the [protein calculator](/protein-calculator) only as general information.'
				]
			}
		],
		formulas: [
			{
				title: 'CKD-EPI 2021 (creatinine)',
				expression: 'eGFR = 142 × min(Scr/κ, 1)^α × max(Scr/κ, 1)^−1.200 × 0.9938^Age × 1.012 [if female]',
				variables: [
					{ symbol: 'Scr', meaning: 'serum creatinine in mg/dL (µmol/L ÷ 88.4)' },
					{ symbol: 'κ', meaning: '0.7 for females, 0.9 for males' },
					{ symbol: 'α', meaning: '−0.241 for females, −0.302 for males' }
				]
			}
		],
		example: {
			title: 'A 50-year-old man with creatinine 1.0 mg/dL',
			steps: ['Scr/κ = 1.0 ÷ 0.9 = 1.111, so the max term applies: 1.111^−1.2 = 0.881', '142 × 0.881 × 0.9938^50 (0.733) = 91.7'],
			result: 'eGFR about 92 mL/min/1.73 m², which is category G1.'
		},
		faq: [
			{
				q: 'What is a normal eGFR?',
				a: 'An eGFR of 90 or above is normal. It naturally falls with age, so 60 to 89 can be normal in older adults. This holds if there are no other signs of kidney damage, such as protein in the urine.'
			},
			{
				q: 'What is a GFR calculator used for?',
				a: 'It estimates kidney function from a creatinine blood test, age and sex. It helps you understand a lab result. It cannot diagnose kidney disease, so discuss any result with your doctor.'
			},
			{
				q: 'Why doesn’t this calculator ask about race?',
				a: 'The 2021 CKD-EPI equation removed the race coefficient used in older equations. The US NKF and ASN task force recommended it for adults.'
			},
			{
				q: 'How do I convert creatinine from µmol/L to mg/dL?',
				a: 'Divide the µmol/L value by 88.4. For example, 88 µmol/L is about 1.0 mg/dL. The calculator converts it for you when you pick the unit.'
			},
			{
				q: 'When is eGFR less reliable?',
				a: 'In people with very high or very low muscle mass, amputations, pregnancy or acute kidney injury, and in children. Doctors may use a cystatin C test in these cases.'
			}
		],
		sources: [
			{ title: 'National Kidney Foundation — Estimated glomerular filtration rate (eGFR)', url: 'https://www.kidney.org/content/kidney-failure-risk-factor-estimated-glomerular-filtration-rate-egfr' },
			{ title: 'National Kidney Foundation — NKF and ASN release new way to diagnose kidney diseases', url: 'https://www.kidney.org/node/93530' },
			{ title: 'Inker LA et al. (2021), New England Journal of Medicine: new creatinine- and cystatin C-based equations', url: 'https://www.nejm.org/doi/full/10.1056/NEJMoa2102953' }
		],
		disclaimer: 'For information only. eGFR is an estimate and cannot diagnose kidney disease. Always discuss your results with a doctor.'
	}
});
