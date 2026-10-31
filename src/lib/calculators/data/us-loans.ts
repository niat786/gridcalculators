/**
 * FHA mortgage insurance premiums: HUD Mortgagee Letter 2023-05, effective for case numbers
 * endorsed on or after March 20, 2023 (still current). UFMIP 1.75%. Annual MIP in basis points.
 */
export const FHA_UFMIP = 0.0175;
export const FHA_MIP_THRESHOLD = 726_200;
export const FHA_MIN_DOWN = 0.035;

/** Annual MIP rate (decimal) and whether it lasts 11 years or the whole loan. */
export function fhaAnnualMip(baseLoan: number, ltv: number, termYears: number): { rate: number; years: number | 'life' } {
	const big = baseLoan > FHA_MIP_THRESHOLD;
	if (termYears > 15) {
		const rate = big ? (ltv > 0.95 ? 0.0075 : 0.007) : ltv > 0.95 ? 0.0055 : 0.005;
		return { rate, years: ltv <= 0.9 ? 11 : 'life' };
	}
	if (!big) return ltv <= 0.9 ? { rate: 0.0015, years: 11 } : { rate: 0.004, years: 'life' };
	if (ltv <= 0.78) return { rate: 0.0015, years: 11 };
	if (ltv <= 0.9) return { rate: 0.004, years: 11 };
	return { rate: 0.0065, years: 'life' };
}

export const FHA_SOURCE = {
	title: 'HUD Mortgagee Letter 2023-05: Annual mortgage insurance premium rates',
	url: 'https://archives.hud.gov/news/2024/2023-05hsgml.pdf'
};

/** VA funding fee for purchase loans (VA, effective April 7, 2023). Exempt borrowers pay 0. */
export function vaFundingFee(downFraction: number, firstUse: boolean): number {
	if (downFraction >= 0.1) return 0.0125;
	if (downFraction >= 0.05) return 0.015;
	return firstUse ? 0.0215 : 0.033;
}

export const VA_SOURCE = {
	title: 'U.S. Department of Veterans Affairs — VA funding fee and loan closing costs',
	url: 'https://www.va.gov/housing-assistance/home-loans/funding-fee-and-closing-costs/'
};
