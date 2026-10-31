// Generates PNG icons and the default social-share image from inline HTML.
// Run once (or after a brand change): node scripts/make-images.mjs   (needs Playwright)
import { chromium } from 'playwright';

const logo = (s) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><rect x="2" y="2" width="9" height="9" rx="2.5" fill="#0071e3"/><rect x="13" y="2" width="9" height="9" rx="2.5" fill="#0071e3" opacity=".55"/><rect x="2" y="13" width="9" height="9" rx="2.5" fill="#0071e3" opacity=".55"/><rect x="13" y="13" width="9" height="9" rx="2.5" fill="#0071e3" opacity=".3"/></svg>`;
const icon = (size) => `<body style="margin:0;width:${size}px;height:${size}px;background:#fff;display:flex;align-items:center;justify-content:center">${logo(Math.round(size * 0.62))}</body>`;
const og = `<body style="margin:0;width:1200px;height:630px;background:#f5f5f7;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;display:flex;flex-direction:column;justify-content:center;padding:0 96px;box-sizing:border-box;color:#1d1d1f">
<div style="display:flex;align-items:center;gap:20px;font-size:40px;font-weight:600">${logo(64)}GridCalculators</div>
<div style="margin-top:40px;font-size:84px;font-weight:700;letter-spacing:-2px;line-height:1.05">The calculator<br>for everything.</div>
<div style="margin-top:28px;font-size:32px;color:#6e6e73">Free, fast and private calculators for money, health and math.</div></body>`;

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [file, html, w, h] of [
	['static/icon-192.png', icon(192), 192, 192],
	['static/icon-512.png', icon(512), 512, 512],
	['static/apple-touch-icon.png', icon(180), 180, 180],
	['static/og-default.png', og, 1200, 630]
]) {
	await page.setViewportSize({ width: w, height: h });
	await page.setContent(html);
	await page.screenshot({ path: file });
}
await browser.close();
console.log('images written');
