/**
 * A small, safe arithmetic expression evaluator for the keypad calculator.
 * No eval / new Function (blocked by our CSP anyway): a tokenizer + recursive-descent parser.
 *
 * Grammar (highest precedence last):
 *   expr    = term (('+' | '-') term)*
 *   term    = unary (('*' | '/') unary | implicit-multiply unary)*
 *   unary   = ('+' | '-') unary | power
 *   power   = postfix ('^' unary)?            right-associative; -2^2 = -4
 *   postfix = primary ('!' | '%')*
 *   primary = number | 'π' | 'e' | 'Ans' | func '(' expr ')' | '(' expr ')'
 * Display symbols × ÷ − √ are accepted. A missing closing ")" at the end is auto-closed.
 */
export type AngleMode = 'deg' | 'rad';

type Tok =
	| { t: 'num'; v: number }
	| { t: 'op'; v: '+' | '-' | '*' | '/' | '^' | '!' | '%' }
	| { t: 'lp' }
	| { t: 'rp' }
	| { t: 'const'; v: 'pi' | 'e' | 'ans' }
	| { t: 'fn'; v: FnName };

const FNS = ['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'ln', 'log', 'sqrt', 'cbrt', 'abs'] as const;
type FnName = (typeof FNS)[number];

export class ExprError extends Error {}

function tokenize(src: string): Tok[] {
	const s = src
		.replace(/×/g, '*')
		.replace(/÷/g, '/')
		.replace(/[−–]/g, '-')
		.replace(/√/g, 'sqrt')
		.replace(/∛/g, 'cbrt')
		.replace(/sin⁻¹/g, 'asin')
		.replace(/cos⁻¹/g, 'acos')
		.replace(/tan⁻¹/g, 'atan')
		.replace(/\s+/g, '');
	const out: Tok[] = [];
	let i = 0;
	while (i < s.length) {
		const c = s[i];
		if (/[0-9.]/.test(c)) {
			const m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(s.slice(i));
			if (!m) throw new ExprError('Bad number');
			out.push({ t: 'num', v: Number(m[0]) });
			i += m[0].length;
		} else if ('+-*/^!%'.includes(c)) {
			out.push({ t: 'op', v: c as '+' });
			i++;
		} else if (c === '(') {
			out.push({ t: 'lp' });
			i++;
		} else if (c === ')') {
			out.push({ t: 'rp' });
			i++;
		} else if (c === 'π') {
			out.push({ t: 'const', v: 'pi' });
			i++;
		} else if (c === 'ℯ') {
			out.push({ t: 'const', v: 'e' });
			i++;
		} else {
			const word = /^[a-zA-Z]+/.exec(s.slice(i))?.[0];
			if (!word) throw new ExprError(`Unexpected “${c}”`);
			const lower = word.toLowerCase();
			const fn = FNS.find((f) => lower.startsWith(f) && lower.length === f.length);
			if (fn) out.push({ t: 'fn', v: fn });
			else if (lower === 'pi') out.push({ t: 'const', v: 'pi' });
			else if (lower === 'e') out.push({ t: 'const', v: 'e' });
			else if (lower === 'ans') out.push({ t: 'const', v: 'ans' });
			else throw new ExprError(`Unknown “${word}”`);
			i += word.length;
		}
	}
	return out;
}

function factorial(n: number): number {
	if (!Number.isInteger(n) || n < 0) throw new ExprError('Factorial needs a whole number ≥ 0');
	if (n > 170) return Infinity;
	let r = 1;
	for (let k = 2; k <= n; k++) r *= k;
	return r;
}

export function evaluate(src: string, opts: { angle?: AngleMode; ans?: number } = {}): number {
	const angle = opts.angle ?? 'deg';
	const toRad = (x: number) => (angle === 'deg' ? (x * Math.PI) / 180 : x);
	const fromRad = (x: number) => (angle === 'deg' ? (x * 180) / Math.PI : x);
	const toks = tokenize(src);
	if (toks.length === 0) throw new ExprError('Empty');
	let p = 0;
	const peek = () => toks[p];
	const isOp = (v: string) => peek()?.t === 'op' && (peek() as { v: string }).v === v;

	function startsPrimary(): boolean {
		const k = peek();
		return !!k && (k.t === 'num' || k.t === 'lp' || k.t === 'const' || k.t === 'fn');
	}

	/** True when toks[from..p) is a bare percentage: "10%" or "(5+5)%". */
	function barePercent(from: number): boolean {
		const last = toks[p - 1];
		if (!(last?.t === 'op' && last.v === '%')) return false;
		const body = toks.slice(from, p - 1);
		if (body.length === 1) return body[0].t === 'num' || body[0].t === 'const';
		return body[0]?.t === 'lp' && body[body.length - 1]?.t === 'rp';
	}
	function expr(): number {
		let v = term();
		while (isOp('+') || isOp('-')) {
			const op = (toks[p++] as { v: string }).v;
			const start = p;
			let r = term();
			// Like a phone or desk calculator: 200 + 10% = 220 and 200 − 15% = 170 (percent of the left side).
			if (barePercent(start)) r = v * r;
			v = op === '+' ? v + r : v - r;
		}
		return v;
	}
	function term(): number {
		let v = unary();
		for (;;) {
			if (isOp('*') || isOp('/')) {
				const op = (toks[p++] as { v: string }).v;
				const r = unary();
				if (op === '/' && r === 0) throw new ExprError('Can’t divide by zero');
				v = op === '*' ? v * r : v / r;
			} else if (startsPrimary()) {
				v *= unary(); // implicit multiplication: 2π, 3(4), 2sin(30)
			} else return v;
		}
	}
	function unary(): number {
		if (isOp('-')) {
			p++;
			return -unary();
		}
		if (isOp('+')) {
			p++;
			return unary();
		}
		return power();
	}
	function power(): number {
		const base = postfix();
		if (isOp('^')) {
			p++;
			return Math.pow(base, unary());
		}
		return base;
	}
	function postfix(): number {
		let v = primary();
		while (isOp('!') || isOp('%')) {
			const op = (toks[p++] as { v: string }).v;
			v = op === '!' ? factorial(v) : v / 100;
		}
		return v;
	}
	function closeParen() {
		if (peek()?.t === 'rp') p++;
		else if (p < toks.length) throw new ExprError('Missing “)”');
		// at end of input: auto-close
	}
	function primary(): number {
		const k = toks[p++];
		if (!k) throw new ExprError('Incomplete expression');
		if (k.t === 'num') return k.v;
		if (k.t === 'const') {
			if (k.v === 'pi') return Math.PI;
			if (k.v === 'e') return Math.E;
			return opts.ans ?? 0;
		}
		if (k.t === 'lp') {
			const v = expr();
			closeParen();
			return v;
		}
		if (k.t === 'fn') {
			let arg: number;
			if (peek()?.t === 'lp') {
				p++;
				arg = expr();
				closeParen();
			} else arg = postfix();
			switch (k.v) {
				case 'sin': return clean(Math.sin(toRad(arg)));
				case 'cos': return clean(Math.cos(toRad(arg)));
				case 'tan': {
					if (angle === 'deg' && Math.abs(arg % 180) === 90) throw new ExprError('tan is undefined here');
					return clean(Math.tan(toRad(arg)));
				}
				case 'asin': return fromRad(Math.asin(arg));
				case 'acos': return fromRad(Math.acos(arg));
				case 'atan': return fromRad(Math.atan(arg));
				case 'ln': return Math.log(arg);
				case 'log': return Math.log10(arg);
				case 'sqrt': return Math.sqrt(arg);
				case 'cbrt': return Math.cbrt(arg);
				case 'abs': return Math.abs(arg);
			}
		}
		throw new ExprError('Unexpected symbol');
	}

	const v = expr();
	if (p < toks.length) throw new ExprError(toks[p].t === 'rp' ? 'Extra “)”' : 'Unexpected symbol');
	if (Number.isNaN(v)) throw new ExprError('Not a real number');
	return v;
}

/** Snap floating noise like sin(180°) = 1.2e-16 to 0. */
function clean(x: number): number {
	return Math.abs(x) < 1e-12 ? 0 : x;
}

/** Format for the display: up to 12 significant digits, exponent for very large/small. */
export function formatResult(x: number): string {
	if (!Number.isFinite(x)) return x > 0 ? '∞' : x < 0 ? '−∞' : 'Error';
	if (x === 0) return '0';
	const abs = Math.abs(x);
	if (abs >= 1e15 || abs < 1e-9) {
		const [m, e] = x.toExponential(10).split('e');
		return `${m.replace(/\.?0+$/, '')}e${e.replace('+', '')}`.replace('-', '−');
	}
	const rounded = Number(x.toPrecision(12));
	return rounded
		.toLocaleString('en-US', { maximumFractionDigits: 11, useGrouping: true })
		.replace('-', '−');
}
