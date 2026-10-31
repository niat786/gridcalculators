import { beforeEach, describe, expect, it } from 'vitest';
import calc from './ir35-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';

beforeEach(() => setCurrency('GBP'));

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

// £500 × 220 days = £110,000. Hand-checked with a separate node script (straight-line maths).
describe('ir35 calculator', () => {
	it('matches the worked example: outside £69,932.00, inside (NI deducted) £66,413.92', () => {
		const r = run();
		expect(metric(r, 'Outside IR35 take-home')).toBe('£69,932.00');
		expect(metric(r, 'Inside IR35 take-home')).toBe('£66,413.92');
		expect(r.primaryResult).toBe('£3,518.08');
		expect(metric(r, 'Corporation tax (outside)')).toBe('£21,768.04'); // 25% × 96,294.50 − 3/200 × 153,705.50
		expect(metric(r, 'Dividend tax (outside)')).toBe('£17,164.46');
	});
	it('client pays employer costs on top: £110,000 loses its allowance to £7,570 → tax 33,432, NI 4,210.60', () => {
		expect(metric(run({ costs: 'ontop' }), 'Inside IR35 take-home')).toBe('£72,357.40');
	});
	it('NI and levy both deducted: deemed payment (110,000 + 750) ÷ 1.155 → £66,172.12', () => {
		expect(metric(run({ costs: 'nilevy' }), 'Inside IR35 take-home')).toBe('£66,172.12');
	});
	it('small company profit uses the 19% rate: £300 × 150 days → take-home £35,247.33', () => {
		// profit 31,294.50; CT 5,945.96; dividends 25,348.55; dividend tax (25,348.55 − 500) × 10.75% = 2,671.22
		const r = run({ rate: '300', days: '150' });
		expect(metric(r, 'Outside IR35 take-home')).toBe('£35,247.33');
	});
	it('high profit removes the personal allowance: £1,500 × 220 days', () => {
		const r = run({ rate: '1500' });
		expect(metric(r, 'Outside IR35 take-home')).toBe('£164,319.23');
	});
	it('break-even inside day rate is above the outside rate when outside wins', () => {
		const r = run();
		const be = Number(metric(r, 'Inside day rate that matches outside')!.replace(/[£,]/g, ''));
		expect(be).toBeGreaterThan(500);
		expect(be).toBeLessThan(600);
	});
	it('invalid input returns —', () => {
		expect(run({ rate: '' }).primaryResult).toBe('—');
		expect(run({ salary: '999999' }).primaryResult).toBe('—');
	});
});
