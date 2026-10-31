import { beforeEach, describe, expect, it } from 'vitest';
import calc from './stamp-duty-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';

beforeEach(() => setCurrency('GBP'));

const run = (over: Record<string, string | boolean> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('stamp duty calculator', () => {
	it('England home mover £350,000 = 2,500 + 5,000', () => {
		const r = run({ price: '350000' });
		expect(r.primaryResult).toBe('£7,500.00');
		expect(r.table?.rows.length).toBe(3);
	});
	it('GOV.UK example: £295,000 purchase owes £4,750', () => {
		expect(run({ price: '295000' }).primaryResult).toBe('£4,750.00');
	});
	it('GOV.UK example: first-time buyer at £500,000 owes £10,000', () => {
		const r = run({ price: '500000', buyer: 'ftb' });
		expect(r.primaryResult).toBe('£10,000.00');
		expect(metric(r, 'Saved by first-time buyer relief')).toBe('£5,000.00'); // standard = 2,500+12,500 = 15,000
	});
	it('first-time buyer relief ends above £500,000: £600,000 pays standard 2,500 + 17,500', () => {
		expect(run({ price: '600000', buyer: 'ftb' }).primaryResult).toBe('£20,000.00');
	});
	it('first-time buyer at £300,000 pays nothing', () => {
		expect(run({ price: '300000', buyer: 'ftb' }).primaryResult).toBe('£0.00');
	});
	it('additional property £300,000: 5,000 + 5% × 300,000 = 20,000', () => {
		const r = run({ price: '300000', buyer: 'additional' });
		expect(r.primaryResult).toBe('£20,000.00');
		expect(metric(r, 'Of which surcharges')).toBe('£15,000.00');
	});
	it('non-UK resident mover £300,000: 5,000 + 2% × 300,000 = 11,000; with additional 26,000', () => {
		expect(run({ price: '300000', nonres: true }).primaryResult).toBe('£11,000.00');
		expect(run({ price: '300000', nonres: true, buyer: 'additional' }).primaryResult).toBe('£26,000.00');
	});
	it('£2,000,000 mover: 2,500 + 33,750 + 57,500 + 60,000 = 153,750', () => {
		expect(run({ price: '2000000' }).primaryResult).toBe('£153,750.00');
	});
	it('higher rates do not apply below £40,000', () => {
		expect(run({ price: '39999', buyer: 'additional' }).primaryResult).toBe('£0.00');
	});
	it('Scotland LBTT £300,000: 2,100 + 2,500 = 4,600; first-time buyer 4,000; ADS adds 24,000', () => {
		expect(run({ price: '300000', nation: 'scotland' }).primaryResult).toBe('£4,600.00');
		const ftb = run({ price: '300000', nation: 'scotland', buyer: 'ftb' });
		expect(ftb.primaryResult).toBe('£4,000.00');
		expect(metric(ftb, 'Saved by first-time buyer relief')).toBe('£600.00');
		expect(run({ price: '300000', nation: 'scotland', buyer: 'additional' }).primaryResult).toBe('£28,600.00');
	});
	it('Wales LTT £300,000: 75,000×6% = 4,500; higher rates 9,000 + 5,950 + 5,000 = 19,950', () => {
		expect(run({ price: '300000', nation: 'wales' }).primaryResult).toBe('£4,500.00');
		expect(run({ price: '300000', nation: 'wales', buyer: 'additional' }).primaryResult).toBe('£19,950.00');
	});
	it('Wales £1,600,000: 10,500 + 26,250 + 75,000 + 12,000 = 123,750; no first-time buyer relief', () => {
		expect(run({ price: '1600000', nation: 'wales' }).primaryResult).toBe('£123,750.00');
		expect(run({ price: '300000', nation: 'wales', buyer: 'ftb' }).primaryResult).toBe('£4,500.00');
	});
	it('invalid price returns —', () => {
		expect(run({ price: '' }).primaryResult).toBe('—');
		expect(run({ price: '0' }).primaryResult).toBe('—');
	});
});
