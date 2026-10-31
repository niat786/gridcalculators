import { beforeEach, describe, expect, it } from 'vitest';
import calc from './statutory-sick-pay-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';

beforeEach(() => setCurrency('GBP'));

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('statutory sick pay calculator', () => {
	it('£400 AWE, 5-day week, 10 days: daily £24.65 (gov.uk table), 2 weeks = £246.50', () => {
		const r = run();
		expect(metric(r, 'Daily SSP')).toBe('£24.65');
		expect(r.primaryResult).toBe('£246.50');
	});
	it('matches the gov.uk daily-rate table for 7, 6, 4, 3, 2 and 1 qualifying days', () => {
		const daily = (q: string) => metric(run({ qdays: q }), 'Daily SSP');
		expect(daily('7')).toBe('£17.61');
		expect(daily('6')).toBe('£20.55');
		expect(daily('4')).toBe('£30.82');
		expect(daily('3')).toBe('£41.09');
		expect(daily('2')).toBe('£61.63');
		expect(daily('1')).toBe('£123.25');
	});
	it('£100 AWE → 80% = £80 a week, £16 a day; 8 days = 80 + 3 × 16 = £128', () => {
		expect(run({ awe: '100', days: '8' }).primaryResult).toBe('£128.00');
	});
	it('£123.40 AWE → £98.72 weekly (rounded up), daily £19.75; 12 days = 2 × 98.72 + 2 × 19.75 = £236.94', () => {
		const r = run({ awe: '123.4', days: '12' });
		expect(metric(r, 'Weekly SSP')).toBe('£98.72');
		expect(r.primaryResult).toBe('£236.94');
	});
	it('no lower earnings limit: £50 AWE still gets £40 a week', () => {
		expect(metric(run({ awe: '50' }), 'Weekly SSP')).toBe('£40.00');
	});
	it('stops at 28 weeks: 196 days at 5 per week pays 28 × £123.25 = £3,451', () => {
		expect(run({ days: '196' }).primaryResult).toBe('£3,451.00');
	});
	it('invalid input returns —', () => {
		expect(run({ awe: '' }).primaryResult).toBe('—');
		expect(run({ days: '' }).primaryResult).toBe('—');
	});
});
