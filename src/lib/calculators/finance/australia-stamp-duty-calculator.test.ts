import { beforeEach, describe, expect, it } from 'vitest';
import calc, { stampDuty } from './australia-stamp-duty-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';
import { ntDuty } from '../data/au-stamp-duty';

const run = (over: Record<string, string | boolean> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const d = (state: string, price: number, buyer = 'investor', first = false, home = 'established', foreign = false) =>
	stampDuty(state, price, buyer, first, home, foreign);

beforeEach(() => setCurrency('AUD'));

// Expected values are hand-computed from each revenue office's published table. Where a revenue office publishes a worked example it is
// reproduced and named in the comment.
describe('australia stamp duty calculator', () => {
	it('NSW: reproduces the Revenue NSW worked example ($450,000 → $14,437)', () => {
		expect(run({ price: '450000', buyer: 'investor' }).primaryResult).toBe('A$14,437');
		expect(d('nsw', 450_000).duty).toBeCloseTo(14_437, 6);
		expect(d('nsw', 750_000).duty).toBeCloseTo(27_937, 6); // 11,602 + 4.5% × 363,000
		expect(d('nsw', 15_000).duty).toBeCloseTo(187.5, 6);
		expect(d('nsw', 1_000).duty).toBe(20); // $20 minimum
		expect(d('nsw', 5_000_000).duty).toBeCloseTo(194_137 + 0.07 * 1_130_000, 6); // premium rate
	});

	it('NSW: first home buyers pay nothing to $800,000, and the $800,000–$1m band is flagged, not guessed', () => {
		expect(d('nsw', 800_000, 'owner', true).duty).toBe(0);
		expect(d('nsw', 800_001, 'owner', true).unsupported).toBeTruthy();
		expect(run({ state: 'nsw', price: '900000', first: true }).primaryResult).toBe('—');
		expect(d('nsw', 1_000_000, 'owner', true).duty).toBeCloseTo(39_187, 6); // 11,602 + 4.5% × 613,000
	});

	it('NSW: foreign purchasers add 9% of the price', () => {
		const r = d('nsw', 750_000, 'investor', false, 'established', true);
		expect(r.surcharge).toBeCloseTo(67_500, 6);
		expect(run({ price: '750000', foreign: true }).primaryResult).toBe('A$95,437');
	});

	it('VIC: general, PPR and whole-value bands', () => {
		expect(d('vic', 700_000).duty).toBeCloseTo(37_070, 6); // 2,870 + 6% × 570,000
		expect(d('vic', 500_000, 'owner').duty).toBeCloseTo(21_970, 6); // PPR: 18,370 + 6% × 60,000
		expect(d('vic', 550_000, 'owner').duty).toBeCloseTo(24_970, 6); // 18,370 + 6% × 110,000
		expect(d('vic', 551_000, 'owner').duty).toBeCloseTo(28_130, 6); // above $550,000 the general rate applies
		expect(d('vic', 1_000_000).duty).toBeCloseTo(55_000, 6); // 5.5% of the whole value
		expect(d('vic', 2_500_000).duty).toBeCloseTo(142_500, 6); // 110,000 + 6.5% × 500,000
	});

	it('VIC: first home buyer exemption and concession reproduce the SRO examples', () => {
		expect(d('vic', 600_000, 'owner', true).duty).toBe(0);
		// SRO examples (as listed by Finder from the State Revenue Office): $625,000 → $5,428; $650,000 → $11,356; $700,000 → $24,713; $725,000 → $32,141
		expect(d('vic', 625_000, 'owner', true).duty).toBe(5_428);
		expect(d('vic', 650_000, 'owner', true).duty).toBe(11_356);
		expect(d('vic', 700_000, 'owner', true).duty).toBe(24_713);
		expect(d('vic', 725_000, 'owner', true).duty).toBe(32_141);
		expect(d('vic', 750_001, 'owner', true).duty).toBeCloseTo(2_870 + 0.06 * 620_001, 4);
		expect(d('vic', 750_000, 'investor', true).duty).toBeCloseTo(2_870 + 0.06 * 620_000, 4); // investors get no concession
		expect(d('vic', 600_000, 'owner', true, 'established', true).surcharge).toBeCloseTo(48_000, 6); // 8% foreign surcharge
	});

	it('QLD: general rates, home concession, and the QRO first home examples', () => {
		expect(d('qld', 600_000).duty).toBeCloseTo(20_025, 6); // 17,325 + 4.5% × 60,000
		expect(d('qld', 600_000, 'owner').duty).toBeCloseTo(12_850, 6); // home concession: 10,150 + 4.5% × 60,000
		expect(d('qld', 600_050).duty).toBeCloseTo(20_029.5, 6); // "or part of $100" rounds 60,050 up to 60,100
		// QRO examples (first home concession, agreements from 1 August 2026): $650,000 → $0 and $850,000 → $24,100
		expect(d('qld', 650_000, 'owner', true).duty).toBe(0);
		expect(d('qld', 850_000, 'owner', true).duty).toBeCloseTo(24_100, 6);
		expect(d('qld', 730_000, 'owner', true).unsupported).toBeTruthy();
		expect(d('qld', 1_200_000, 'owner', true, 'new').duty).toBe(0); // new home: full concession, no cap
		const f = d('qld', 600_000, 'owner', false, 'established', true);
		expect(f.duty).toBeCloseTo(20_025, 6); // foreign buyers get no home concession
		expect(f.surcharge).toBeCloseTo(48_000, 6);
	});

	it('WA: general rates and the first home owner rate', () => {
		expect(d('wa', 600_000).duty).toBeCloseTo(22_515, 6); // 11,115 + 4.75% × 240,000
		expect(d('wa', 850_000).duty).toBeCloseTo(34_890.5, 6); // 28,453 + 5.15% × 125,000
		expect(d('wa', 600_000, 'owner', true).duty).toBe(0);
		expect(d('wa', 700_000, 'owner', true).duty).toBeCloseTo(16_150, 6); // $16.15 per $100 over $600,000
		expect(d('wa', 800_000, 'owner', true).duty).toBeCloseTo(32_300, 6);
		expect(d('wa', 800_001, 'owner', true).duty).toBeCloseTo(28_453 + 0.0515 * 75_100, 2); // rounded up to the next $100;
		const f = d('wa', 700_000, 'owner', true, 'established', true); // WA applies foreign duty on top of the first home owner rate
		expect(f.duty).toBeCloseTo(16_150, 6);
		expect(f.surcharge).toBeCloseTo(49_000, 6);
	});

	it('SA and TAS: published tables', () => {
		expect(d('sa', 500_000).duty).toBeCloseTo(21_330, 6);
		expect(d('sa', 650_000).duty).toBeCloseTo(29_580, 6);
		expect(d('sa', 650_000, 'owner', true, 'new').duty).toBe(0);
		expect(d('sa', 650_000, 'owner', true, 'established').duty).toBeCloseTo(29_580, 6);
		expect(d('tas', 500_000).duty).toBeCloseTo(18_247.5, 6); // 12,935 + 4.25% × 125,000
		expect(d('tas', 2_000).duty).toBe(50);
		expect(d('tas', 500_000, 'owner', true).unsupported).toBeTruthy();
		expect(d('tas', 500_000, 'investor', false, 'established', true).surcharge).toBeCloseTo(40_000, 6);
	});

	it('NT: formula and first home owner discount', () => {
		// 0.06571441 × 500² + 15 × 500 = 23,928.6025 → rounded down to 5 cents = 23,928.60 (the FHOD maximum)
		expect(ntDuty(500_000)).toBeCloseTo(23_928.6, 6);
		expect(ntDuty(525_000)).toBeCloseTo(25_987.5, 6); // formula meets 4.95% at $525,000
		expect(ntDuty(600_000)).toBeCloseTo(29_700, 6);
		expect(ntDuty(3_000_000)).toBeCloseTo(172_500, 6);
		expect(d('nt', 600_000, 'owner', true).duty).toBeCloseTo(5_771.4, 6);
		expect(d('nt', 650_000, 'owner', true).duty).toBeCloseTo(8_246.4, 6);
		expect(d('nt', 651_000, 'owner', true).duty).toBeCloseTo(0.0495 * 651_000, 6);
		expect(d('nt', 600_000, 'owner', true, 'new').duty).toBeCloseTo(29_700, 6);
		expect(d('nt', 300_000, 'owner', true).duty).toBe(0); // discount cannot make duty negative
	});

	it('handles invalid input and hides nothing important', () => {
		expect(run({ price: '' }).primaryResult).toBe('—');
		expect(run({ price: '0' }).primaryResult).toBe('—');
		expect(run({ state: 'xx' }).primaryResult).toBe('—');
		expect(run({ state: 'sa', foreign: true }).summary).toContain('none is added');
	});
});
