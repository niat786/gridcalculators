import { beforeEach, describe, expect, it } from 'vitest';
import calc from './uk-take-home-pay-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';

beforeEach(() => setCurrency('GBP'));

// Defaults: 5% net-pay pension, so every case sets pension to 0 unless stated.
const run = (over: Record<string, string | boolean> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), pension: '0', period: 'year', ...over }));
const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

// Hand calculations (annual basis), 2026/27: PA £12,570; basic 20% to £37,700 taxable; higher 40% to £125,140;
// NI 8% between £12,570 and £50,270, 2% above.
describe('uk take-home pay calculator', () => {
	it('£12,570 pays no tax or NI', () => {
		const r = run({ salary: '12570' });
		expect(r.primaryResult).toBe('£12,570.00');
		expect(metric(r, 'Income tax')).toBe('£0.00');
		expect(metric(r, 'National Insurance')).toBe('£0.00');
	});
	it('£50,270: tax 37,700×20% = 7,540; NI 37,700×8% = 3,016', () => {
		const r = run({ salary: '50270' });
		expect(metric(r, 'Income tax')).toBe('£7,540.00');
		expect(metric(r, 'National Insurance')).toBe('£3,016.00');
		expect(r.primaryResult).toBe('£39,714.00');
		expect(run({ salary: '50270', period: 'month' }).primaryResult).toBe('£3,309.50');
	});
	it('£100,000: tax 7,540 + 49,730×40% = 27,432; NI 3,016 + 49,730×2% = 4,010.60', () => {
		const r = run({ salary: '100000' });
		expect(metric(r, 'Income tax')).toBe('£27,432.00');
		expect(metric(r, 'National Insurance')).toBe('£4,010.60');
		expect(r.primaryResult).toBe('£68,557.40');
	});
	it('£125,140: allowance gone; tax 7,540 + 87,440×40% = 42,516; NI 3,016 + 74,870×2% = 4,513.40', () => {
		const r = run({ salary: '125140' });
		expect(metric(r, 'Income tax')).toBe('£42,516.00');
		expect(metric(r, 'National Insurance')).toBe('£4,513.40');
		expect(r.primaryResult).toBe('£78,110.60');
	});
	it('£110,000: allowance 12,570 − 5,000 = 7,570; taxable 102,430 → 7,540 + 64,730×40% = 33,432', () => {
		expect(metric(run({ salary: '110000' }), 'Income tax')).toBe('£33,432.00');
	});
	it('Scotland £50,270: 753.73 + 2,597.80 + 2,968.56 + 2,775.36 = 9,095.45 tax', () => {
		const r = run({ salary: '50270', region: 'scotland' });
		expect(metric(r, 'Income tax')).toBe('£9,095.45');
		expect(r.primaryResult).toBe('£38,158.55');
	});
	it('Plan 2 at £50,270 repays 9% × (50,270 − 29,385) = 1,879.65', () => {
		const r = run({ salary: '50270', plan: 'plan2' });
		expect(metric(r, 'Student loan')).toBe('£1,879.65');
		expect(r.primaryResult).toBe('£37,834.35');
	});
	it('Plan 5 starts at £25,000 and Postgraduate adds 6% over £21,000', () => {
		expect(metric(run({ salary: '30000', plan: 'plan5' }), 'Student loan')).toBe('£450.00');
		expect(metric(run({ salary: '30000', plan: 'plan5', pgAlso: true }), 'Student loan')).toBe('£990.00'); // 450 + 6% × (30,000 − 21,000) = 540
	});
	it('salary sacrifice 5% of £50,270: pay 47,756.50 → tax 7,037.30, NI 2,814.92', () => {
		const r = run({ salary: '50270', pension: '5', pensionType: 'sacrifice' });
		expect(r.primaryResult).toBe('£37,904.28');
	});
	it('net pay 5% of £50,270: tax 7,037.30, NI 3,016', () => {
		expect(run({ salary: '50270', pension: '5', pensionType: 'net' }).primaryResult).toBe('£37,703.20');
	});
	it('relief at source 5% at £100,000: pays 4,000 net, claims back extra 1,000', () => {
		const r = run({ salary: '100000', pension: '5', pensionType: 'ras' });
		expect(metric(r, 'Pension (your cost)')).toBe('£4,000.00');
		expect(metric(r, 'Extra pension tax relief to claim')).toBe('£1,000.00');
		expect(r.primaryResult).toBe('£64,557.40'); // 100,000 − 4,000 − 27,432 − 4,010.60
	});
	it('K code and flat codes', () => {
		expect(metric(run({ salary: '20000', code: 'BR' }), 'Income tax')).toBe('£4,000.00');
		expect(metric(run({ salary: '20000', code: 'K100' }), 'Income tax')).toBe('£4,200.00'); // (20,000+1,000)×20%
	});
	it('over State Pension age pays no NI', () => {
		expect(metric(run({ salary: '50270', spa: true }), 'National Insurance')).toBe('£0.00');
	});
	it('invalid input returns —', () => {
		expect(run({ salary: '' }).primaryResult).toBe('—');
		expect(run({ code: 'ZZZ' }).primaryResult).toBe('—');
	});
});
