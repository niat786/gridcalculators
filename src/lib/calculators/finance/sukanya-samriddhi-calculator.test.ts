import { beforeEach, describe, expect, it } from 'vitest';
import calc, { ssySchedule } from './sukanya-samriddhi-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';

const run = (over: Record<string, string | boolean> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-10-28'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

beforeEach(() => setCurrency('INR'));

describe('sukanya samriddhi calculator', () => {
	it('reproduces the published example: ₹1.5 lakh a year at 8.2% gives about ₹71.82 lakh (Jainam calculator page)', () => {
		const r = run({ deposit: '150000', rate: '8.2' });
		expect(r.primaryResult).toBe('₹71,82,119.17');
		expect(metric(r, 'Total you deposit')).toBe('₹22,50,000.00');
		expect(metric(r, 'Interest earned')).toBe('₹49,32,119.17'); // published: ₹49.32 lakh
		expect(metric(r, 'Balance when deposits stop (year 15)')).toBe('₹44,75,989.33');
	});

	it('matches the closed form P(1+r)((1+r)^15 - 1)/r x (1+r)^6', () => {
		const r = 0.082;
		const closed = (150000 * (1 + r) * (Math.pow(1 + r, 15) - 1)) / r * Math.pow(1 + r, 6);
		const rows = ssySchedule(150000, 8.2);
		expect(rows[20].balance).toBeCloseTo(closed, 4);
	});

	it('₹5,000 a month (₹60,000 a year) at 8.2%', () => {
		// Equentis (5,000 a month): its 16.5-17.9 lakh range for year 15 has 17.9 lakh as the start-of-year case
		const r = run({ deposit: '60000' });
		expect(r.primaryResult).toBe('₹28,72,847.67');
		expect(metric(r, 'Balance when deposits stop (year 15)')).toBe('₹17,90,395.73');
	});

	it('minimum deposit ₹250 a year', () => {
		expect(run({ deposit: '250' }).primaryResult).toBe('₹11,970.20');
	});

	it('zero rate returns just the deposits; other rate', () => {
		expect(run({ deposit: '100000', rate: '0' }).primaryResult).toBe('₹15,00,000.00');
		expect(run({ deposit: '150000', rate: '7' }).primaryResult).toBe('₹60,52,757.71');
	});

	it('shows the maturity year and age', () => {
		const r = run({ age: '9', opened: '2026-10-28' });
		expect(metric(r, 'Maturity year')).toBe('2047 (age 30)');
		expect(metric(r, 'Last deposit year')).toBe('2041');
		expect(r.table!.rows).toHaveLength(21);
	});

	it('rejects invalid input', () => {
		expect(run({ deposit: '249' }).primaryResult).toBe('—');
		expect(run({ deposit: '150001' }).primaryResult).toBe('—');
		expect(run({ age: '10' }).primaryResult).toBe('—');
		expect(run({ age: '-1' }).primaryResult).toBe('—');
		expect(run({ age: '2.5' }).primaryResult).toBe('—');
		expect(run({ rate: '' }).primaryResult).toBe('—');
		expect(run({ opened: 'x' }).primaryResult).toBe('—');
		expect(run({ age: '0' }).primaryResult).not.toBe('—');
		expect(run({ age: '9' }).primaryResult).not.toBe('—');
	});
});
