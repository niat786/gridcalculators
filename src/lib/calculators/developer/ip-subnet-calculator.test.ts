import { describe, expect, it } from 'vitest';
import calc from './ip-subnet-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import type { CalculationResult } from '../types';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (r: CalculationResult, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('ip subnet calculator', () => {
	it('matches the worked example 192.168.1.10/24', () => {
		const r = run();
		expect(r.primaryResult).toBe('192.168.1.0/24');
		expect(metric(r, 'Subnet mask')).toBe('255.255.255.0');
		expect(metric(r, 'Wildcard mask')).toBe('0.0.0.255');
		expect(metric(r, 'Broadcast address')).toBe('192.168.1.255');
		expect(metric(r, 'First usable host')).toBe('192.168.1.1');
		expect(metric(r, 'Last usable host')).toBe('192.168.1.254');
		expect(metric(r, 'Usable hosts')).toBe('254');
	});

	it('handles a /8 private block (10.0.0.1/8)', () => {
		const r = run({ address: '10.0.0.1/8' });
		expect(r.primaryResult).toBe('10.0.0.0/8');
		expect(metric(r, 'Broadcast address')).toBe('10.255.255.255');
		expect(metric(r, 'Usable hosts')).toBe('16,777,214');
		expect(r.table?.rows.find((x) => x.item === 'Address type')?.value).toBe('Private (RFC 1918)');
	});

	it('handles a /30 block (172.16.5.4/30)', () => {
		const r = run({ address: '172.16.5.4/30' });
		expect(r.primaryResult).toBe('172.16.5.4/30');
		expect(metric(r, 'Subnet mask')).toBe('255.255.255.252');
		expect(metric(r, 'First usable host')).toBe('172.16.5.5');
		expect(metric(r, 'Last usable host')).toBe('172.16.5.6');
		expect(metric(r, 'Usable hosts')).toBe('2');
	});

	it('treats /31 as two usable addresses (RFC 3021) and /32 as one host', () => {
		const p2p = run({ address: '10.1.1.0/31' });
		expect(metric(p2p, 'First usable host')).toBe('10.1.1.0');
		expect(metric(p2p, 'Last usable host')).toBe('10.1.1.1');
		expect(metric(p2p, 'Usable hosts')).toBe('2');
		const host = run({ address: '1.1.1.1/32' });
		expect(metric(host, 'Subnet mask')).toBe('255.255.255.255');
		expect(metric(host, 'Usable hosts')).toBe('1');
	});

	it('uses the prefix menu when the address has no /prefix', () => {
		const r = run({ address: '192.168.0.7', prefix: '16' });
		expect(r.primaryResult).toBe('192.168.0.0/16');
		expect(metric(r, 'Broadcast address')).toBe('192.168.255.255');
		expect(metric(r, 'Usable hosts')).toBe('65,534');
	});

	it('classes and classifies addresses', () => {
		expect(run({ address: '172.16.0.1/12' }).table?.rows.find((x) => x.item === 'IP class')?.value).toBe('Class B');
		expect(run({ address: '224.0.0.1/24' }).table?.rows.find((x) => x.item === 'IP class')?.value).toBe(
			'Class D (multicast)'
		);
		expect(run({ address: '8.8.8.8/0' }).table?.rows.find((x) => x.item === 'Address type')?.value).toBe(
			'Public (outside RFC 1918)'
		);
	});

	it('returns a dash for invalid addresses or prefixes', () => {
		expect(run({ address: '256.1.1.1/24' }).primaryResult).toBe('—');
		expect(run({ address: '192.168.1.1/33' }).primaryResult).toBe('—');
		expect(run({ address: 'not an address' }).primaryResult).toBe('—');
	});
});
