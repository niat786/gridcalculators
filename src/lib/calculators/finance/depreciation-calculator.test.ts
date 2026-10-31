import { describe, expect, it } from 'vitest';
import calc from './depreciation-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('depreciation calculator', () => {
	it('straight-line default: $20,000 less $2,000 over 5 years is $3,600 a year', () => {
		const r = run();
		expect(r.primaryResult).toBe('$3,600.00');
		expect(r.secondaryMetrics?.[0].value).toBe('$18,000.00');
		expect(r.secondaryMetrics?.[2].value).toBe('$2,000.00');
		expect(r.table?.rows[4].bookValue).toBe('$2,000.00');
	});

	it('double-declining balance switches to straight-line in year 4 (worked example)', () => {
		const r = run({ cost: '10000', salvage: '0', life: '5', method: 'ddb' });
		expect(r.primaryResult).toBe('$4,000.00');
		const rows = r.table?.rows ?? [];
		expect(rows.map((x) => x.depreciation)).toEqual(['$4,000.00', '$2,400.00', '$1,440.00', '$1,080.00', '$1,080.00']);
		expect(rows[4].bookValue).toBe('$0.00');
	});

	it('double-declining balance with salvage: first two years on $20,000 less $2,000', () => {
		const r = run({ method: 'ddb' });
		expect(r.primaryResult).toBe('$8,000.00');
		expect(r.table?.rows[1].depreciation).toBe('$4,800.00');
		// Year 5 is capped at the remaining $592 so the book value stops at salvage
		expect(r.table?.rows[4].depreciation).toBe('$592.00');
		expect(r.table?.rows[4].bookValue).toBe('$2,000.00');
	});

	it('sum-of-the-years digits: $20,000 less $2,000 over 5 years', () => {
		// digits 5+4+3+2+1 = 15; year 1 = 18,000 × 5 ÷ 15 = 6,000; year 5 = 18,000 × 1 ÷ 15 = 1,200
		const r = run({ method: 'syd' });
		expect(r.primaryResult).toBe('$6,000.00');
		expect(r.table?.rows[4].depreciation).toBe('$1,200.00');
		expect(r.secondaryMetrics?.[0].value).toBe('$18,000.00');
	});

	it('returns a dash for invalid input', () => {
		expect(run({ salvage: '30000' }).primaryResult).toBe('—');
		expect(run({ life: '' }).primaryResult).toBe('—');
	});
});
