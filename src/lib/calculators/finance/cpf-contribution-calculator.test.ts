import { beforeEach, describe, expect, it } from 'vitest';
import calc from './cpf-contribution-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';

// Expected values were computed independently by hand and with a separate node script from the CPF Board's 2026 rates
// (total rate x wage rounded to the dollar, employee cents dropped, allocation as % of wages) and match the published
// worked example in the sources (age 58 on $5,000: employee $900, employer $800).
const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (r: ReturnType<typeof run>, start: string) => r.secondaryMetrics?.find((m) => m.label.startsWith(start))?.value;
const S = (s: string) => `SGD ${s}`;

beforeEach(() => setCurrency('SGD'));

describe('cpf contribution calculator (Singapore, 2026)', () => {
	it('matches the worked example: $5,000 a month, age 35 and below', () => {
		const r = run();
		expect(r.primaryResult).toBe(S('1,850.00'));
		expect(metric(r, 'Employee share')).toBe(S('1,000.00'));
		expect(metric(r, 'Employer share')).toBe(S('850.00'));
		expect(metric(r, 'Take-home pay')).toBe(S('4,000.00'));
		expect(metric(r, 'Ordinary Account')).toBe(S('1,150.00'));
		expect(metric(r, 'Special Account')).toBe(S('300.00'));
		expect(metric(r, 'MediSave')).toBe(S('400.00'));
	});

	it('age above 55 to 60 at $5,000: 18% + 16% (published example: $900 and $800)', () => {
		const r = run({ age: 'a55' });
		expect(r.primaryResult).toBe(S('1,700.00'));
		expect(metric(r, 'Employee share')).toBe(S('900.00'));
		expect(metric(r, 'Employer share')).toBe(S('800.00'));
		expect(metric(r, 'Ordinary Account')).toBe(S('600.00'));
		expect(metric(r, 'Retirement Account')).toBe(S('575.00'));
		expect(metric(r, 'MediSave')).toBe(S('525.00'));
	});

	it('wage above the $8,000 ceiling is capped: $10,000 pays the same as $8,000', () => {
		const r = run({ wage: '10000' });
		expect(r.primaryResult).toBe(S('2,960.00'));
		expect(metric(r, 'Employee share')).toBe(S('1,600.00'));
		expect(metric(r, 'Employer share')).toBe(S('1,360.00'));
		expect(run({ wage: '8000' }).primaryResult).toBe(S('2,960.00'));
		expect(metric(r, 'Take-home pay')).toBe(S('8,400.00'));
	});

	it('older age bands: 60-65 at $6,000, 65-70 at $7,000', () => {
		const a = run({ wage: '6000', age: 'a60' });
		expect(a.primaryResult).toBe(S('1,500.00'));
		expect(metric(a, 'Employee share')).toBe(S('750.00'));
		expect(metric(a, 'Employer share')).toBe(S('750.00'));
		const b = run({ wage: '7000', age: 'a65' });
		expect(b.primaryResult).toBe(S('1,155.00'));
		expect(metric(b, 'Employee share')).toBe(S('525.00'));
		expect(metric(b, 'Employer share')).toBe(S('630.00'));
	});

	it('rounding: total to the nearest dollar, employee cents dropped, employer takes the rest', () => {
		const old = run({ wage: '3333.33', age: 'a70' });
		expect(old.primaryResult).toBe(S('417.00')); // 12.5% = 416.67
		expect(metric(old, 'Employee share')).toBe(S('166.00')); // 5% = 166.67 -> 166
		expect(metric(old, 'Employer share')).toBe(S('251.00'));
		const young = run({ wage: '4001.5' });
		expect(young.primaryResult).toBe(S('1,481.00')); // 37% = 1,480.555
		expect(metric(young, 'Employee share')).toBe(S('800.00')); // 800.30 -> 800
		expect(metric(young, 'Employer share')).toBe(S('681.00'));
	});

	it('bonus: $10,000 at age 35 and below with $5,000 wages pays 3,700; ceiling cuts it at $8,000 wages', () => {
		expect(metric(run({ bonus: '10000' }), 'CPF on the bonus')).toBe(S('3,700.00'));
		// wages at the ceiling use 96,000 of the 102,000, so only 6,000 of a 20,000 bonus counts: 37% = 2,220
		expect(metric(run({ wage: '8000', bonus: '20000' }), 'CPF on the bonus')).toBe(S('2,220.00'));
		expect(metric(run({ bonus: '0' }), 'CPF on the bonus')).toBe(S('0.00'));
	});

	it('allocations always add up to the total', () => {
		for (const age of ['u35', 'a35', 'a45', 'a50', 'a55', 'a60', 'a65', 'a70']) {
			const r = run({ age, wage: '4321.45' });
			const get = (s: string) => Number((metric(r, s) ?? '').replace(/[^0-9.]/g, ''));
			const acc = get('Ordinary') + get(age === 'u35' || age === 'a35' || age === 'a45' || age === 'a50' ? 'Special' : 'Retirement') + get('MediSave');
			expect(acc, age).toBe(Number(r.primaryResult.replace(/[^0-9.]/g, '')));
		}
	});

	it('wages of $750 or less are outside this tool; invalid input gives a dash', () => {
		expect(run({ wage: '750' }).primaryResult).toBe('—');
		expect(run({ wage: '750.01' }).primaryResult).not.toBe('—');
		expect(run({ wage: '' }).primaryResult).toBe('—');
		expect(run({ bonus: '-1' }).primaryResult).toBe('—');
	});
});
