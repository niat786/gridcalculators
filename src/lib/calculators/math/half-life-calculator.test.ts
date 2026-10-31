import { describe, expect, it } from 'vitest';
import calc from './half-life-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (over: Record<string, string>, label: string) =>
	run(over).secondaryMetrics?.find((m) => m.label === label)?.value;

describe('half-life calculator', () => {
	it('solves the remaining amount: 100 after 20 with half-life 10 gives 25', () => {
		expect(run({ solve: 'remaining', initial: '100', time: '20', halfLife: '10' }).primaryResult).toBe('25');
	});

	it('matches the worked example: 500 with half-life 15 after 45 gives 62.5', () => {
		const over = { solve: 'remaining', initial: '500', time: '45', halfLife: '15' };
		expect(run(over).primaryResult).toBe('62.5');
		expect(metric(over, 'Decay constant λ')).toBe('0.04621 per time unit');
		expect(metric(over, 'Mean lifetime τ')).toBe('21.6404 time units');
		expect(metric(over, 'Half-lives elapsed')).toBe('3');
	});

	it('solves the starting amount: 12.5 left after 3 with half-life 1 means 100 at the start', () => {
		expect(run({ solve: 'initial', remaining: '12.5', time: '3', halfLife: '1' }).primaryResult).toBe('100');
	});

	it('solves the elapsed time: 80 down to 10 with half-life 3 takes 9', () => {
		expect(run({ solve: 'time', initial: '80', remaining: '10', halfLife: '3' }).primaryResult).toBe('9');
	});

	it('solves the half-life: 100 down to 12.5 in 3 time units gives 1', () => {
		expect(run({ solve: 'halfLife', initial: '100', remaining: '12.5', time: '3' }).primaryResult).toBe('1');
	});

	it('returns a dash for impossible input', () => {
		expect(run({ solve: 'remaining', initial: '100', time: '20', halfLife: '0' }).primaryResult).toBe('—');
		expect(run({ solve: 'time', initial: '100', remaining: '150', halfLife: '10' }).primaryResult).toBe('—');
		expect(run({ solve: 'halfLife', initial: '100', remaining: '100', time: '3' }).primaryResult).toBe('—');
		expect(run({ solve: 'initial', remaining: 'abc', time: '3', halfLife: '1' }).primaryResult).toBe('—');
	});
});
