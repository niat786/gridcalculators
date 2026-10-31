/**
 * The calculator contract (see .clauderules §2A).
 *
 * Each calculator is two files, named after its slug (e.g. bmi-calculator):
 *   <slug>.meta.ts — light metadata used by listings, search, sitemap and matchers (no math).
 *   <slug>.calc.ts — the full config: inputs, the pure `calculate` function and SEO content.
 * Only the calculator page loads the .calc.ts chunk, so hundreds of calculators never bloat
 * the home page or each other.
 */
import type { IconName } from '../icons';
import type { CurrencyCode } from './format';
import type { RegionCode } from './regions';

export type CategoryId = 'finance' | 'health' | 'math' | 'everyday' | 'developer';

export type RowValue = Record<string, number | string>;
export type InputValue = number | string | boolean | number[] | RowValue[];
export type InputValues = Record<string, InputValue>;

interface InputBase {
	id: string;
	label: string;
	/** One short line under the field. */
	help?: string;
	/** Hide the field unless this returns true (e.g. metric vs imperial fields). */
	visibleWhen?: (values: InputValues) => boolean;
	/** 'half' keeps short fields side by side even on phones (e.g. feet + inches). */
	width?: 'half';
}

export interface NumberInput extends InputBase {
	type: 'number';
	default: number;
	min?: number;
	max?: number;
	step?: number;
	/** Text shown before the value inside the field, e.g. "$". */
	prefix?: string;
	/** Text shown after the value inside the field, e.g. "%" or "years". */
	suffix?: string;
	/** Allow decimals (true) or whole numbers only. Default true. */
	decimal?: boolean;
}

export interface SliderInput extends InputBase {
	type: 'slider';
	default: number;
	min: number;
	max: number;
	step: number;
	suffix?: string;
}

export interface SelectInput extends InputBase {
	type: 'select';
	default: string;
	options: { label: string; value: string }[];
	/** 'segmented' for 2–4 short options (HIG segmented control), 'menu' otherwise. */
	display?: 'segmented' | 'menu';
}

export interface ToggleInput extends InputBase {
	type: 'toggle';
	default: boolean;
}

export interface DateInput extends InputBase {
	type: 'date';
	/** ISO date (YYYY-MM-DD) or 'today'. */
	default: string;
}

/** Free text: words, binary/hex strings, text to encode. calculate() receives the string. */
export interface TextInput extends InputBase {
	type: 'text';
	default: string;
	/** Textarea instead of a single line. */
	multiline?: boolean;
	placeholder?: string;
	/** Hard limit (default 5,000). Longer values are rejected so URLs stay sane. */
	maxLength?: number;
	/** Monospace font, e.g. for code, binary or Base64. */
	monospace?: boolean;
	/** Optional allowed pattern, e.g. /^[01\s]*$/ for binary. */
	pattern?: RegExp;
	/** Message when `pattern` fails. */
	patternMessage?: string;
}

/** Time of day, "HH:MM" (24-hour). Shown with the device's native time picker. */
export interface TimeInput extends InputBase {
	type: 'time';
	default: string;
}

/**
 * A duration split into unit fields, e.g. ['h', 'm', 's'] → three small fields.
 * `default` is "1:30:0" in the same unit order. calculate() receives total SECONDS.
 */
export interface DurationInput extends InputBase {
	type: 'duration';
	units: ('d' | 'h' | 'm' | 's')[];
	default: string;
	/** Allow a negative duration (adds a sign toggle). Default false. */
	allowNegative?: boolean;
}

/** A free list of numbers ("4, 8, 15, 16"). calculate() receives number[]. */
export interface ListInput extends InputBase {
	type: 'list';
	default: string;
	minCount?: number;
	maxCount?: number;
	placeholder?: string;
}

/** A column inside a repeating-rows input. */
export type RowColumn =
	| { id: string; label: string; type: 'number'; default: number; min?: number; max?: number; prefix?: string; suffix?: string }
	| { id: string; label: string; type: 'select'; default: string; options: { label: string; value: string }[] }
	| { id: string; label: string; type: 'text'; default: string; placeholder?: string };

/**
 * Repeating rows, e.g. courses (name, credits, grade) or debts (balance, rate, payment).
 * calculate() receives RowValue[] with numbers already parsed.
 */
export interface RowsInput extends InputBase {
	type: 'rows';
	columns: RowColumn[];
	default: RowValue[];
	minRows?: number;
	maxRows?: number;
	/** Label for the add button, e.g. "Add course". */
	addLabel?: string;
}

export type CalculatorInput =
	| NumberInput
	| SliderInput
	| SelectInput
	| ToggleInput
	| DateInput
	| TextInput
	| TimeInput
	| DurationInput
	| ListInput
	| RowsInput;

export interface Metric {
	label: string;
	value: string;
}

export interface GaugeBand {
	/** Upper bound of this band (exclusive). The last band runs to `max`. */
	to: number;
	label: string;
}

export interface Gauge {
	min: number;
	max: number;
	value: number;
	bands: GaugeBand[];
}

export interface LineChart {
	type: 'line';
	title: string;
	/** Key in each data row used for the x axis. */
	x: string;
	xLabel: string;
	/** Up to two series on one shared axis (never a dual axis). */
	series: { key: string; label: string }[];
	data: Record<string, number>[];
	valueFormat: 'currency' | 'number';
}

export interface Table {
	title: string;
	columns: { key: string; label: string; align?: 'start' | 'end' }[];
	rows: Record<string, string>[];
	/** Collapsed by default (HIG progressive disclosure). */
	collapsed?: boolean;
}

export interface CalculationResult {
	/** Already formatted, e.g. "$2,022.62". Use '—' when inputs are invalid. */
	primaryResult: string;
	primaryLabel: string;
	/** Render primaryResult as long monospace text (encoders, converters, binary). */
	long?: boolean;
	/** One short sentence under the result, e.g. the BMI category. */
	summary?: string;
	secondaryMetrics?: Metric[];
	gauge?: Gauge;
	chart?: LineChart;
	table?: Table;
}

export interface FormulaBlock {
	title?: string;
	/** Plain-text formula, e.g. "M = P × r(1 + r)ⁿ ÷ ((1 + r)ⁿ − 1)". */
	expression: string;
	variables: { symbol: string; meaning: string }[];
}

/**
 * An explanatory section under the calculator (H2 + paragraphs). Text may contain internal links written as
 * [anchor text](/calculator-slug) and **bold**; nothing else is interpreted (no HTML).
 */
export interface ContentSection {
	heading: string;
	paragraphs: string[];
	/** Optional bullet list shown after the paragraphs. */
	list?: string[];
	/** Optional small table (e.g. BMI categories, tax slabs). */
	table?: { caption?: string; columns: string[]; rows: string[][] };
}

export interface CalculatorContent {
	/** 1–2 sentences under the H1. */
	intro: string;
	/** Explanatory sections (what it is, how it works, how to read the result, tips). See docs/CONTENT_GUIDE.md. */
	about?: ContentSection[];
	/** Short "How to use" steps. */
	howTo: string[];
	formulas: FormulaBlock[];
	example: { title: string; steps: string[]; result: string };
	faq: { q: string; a: string }[];
	/** Authoritative references (E-E-A-T). */
	sources?: { title: string; url: string }[];
	/** Shown under the result for health or money tools. */
	disclaimer?: string;
}

export interface CalculatorMeta {
	slug: string;
	name: string;
	category: CategoryId;
	/** One line for cards and search results. */
	shortDescription: string;
	/** ≤ 60 characters. */
	metaTitle: string;
	/** 120–160 characters. */
	metaDescription: string;
	icon: IconName;
	keywords: string[];
	/** Lower = more popular; omit to keep it off the home page "Popular" grid. */
	popularRank?: number;
	/** ISO date the math and copy were last reviewed. */
	updated: string;
	/** Hand-picked related calculator slugs, shown first under "Related calculators". */
	related?: string[];
	/**
	 * Where the rules apply. Omit for universal maths (works anywhere).
	 * A code from regions.ts ('US', 'UK', 'IN', 'AE', 'GCC'…) shows a clear badge and note on the page.
	 */
	region?: RegionCode;
	/** One sentence shown with the region badge, e.g. what to use elsewhere. */
	regionNote?: string;
	/**
	 * Money handling. 'any' = person picks a currency (universal maths).
	 * A currency code ('USD', 'INR', 'AED'…) = fixed by the country's rules. Omit if no money is shown.
	 * Tools whose currency depends on an input (e.g. a GCC country picker) omit this and format
	 * with moneyIn(code, n).
	 */
	money?: 'any' | CurrencyCode;
	/** With money: 'any', the currency shown first (e.g. 'INR' for an EMI calculator most used in India). */
	defaultCurrency?: CurrencyCode;
}

/** Tools that need their own interface instead of the input form (e.g. the keypad calculator). */
export interface CalculatorWidget {
	name: 'keypad' | 'random' | 'password' | 'currency' | 'dice';
	props?: Record<string, string | number | boolean>;
}

export interface CalculatorConfig {
	meta: CalculatorMeta;
	/** When set, this widget replaces the input form and result card. `inputs` may be empty. */
	widget?: CalculatorWidget;
	inputs: CalculatorInput[];
	calculate: (inputs: InputValues) => CalculationResult;
	content: CalculatorContent;
}

export function defineMeta(meta: CalculatorMeta): CalculatorMeta {
	return meta;
}

export function defineCalculator(config: CalculatorConfig): CalculatorConfig {
	return config;
}
