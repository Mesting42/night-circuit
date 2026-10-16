import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--ignore-gpu-blocklist'] });
const results = [];
const baseUrl = process.argv[2] || 'http://localhost:5178/';
const screenshotPrefix = baseUrl.includes('.pages.dev') ? 'cloudflare-' : '';
fs.mkdirSync('artifacts/screenshots', { recursive: true });

try {
  for (const [name, viewport] of [
    ['phone-landscape', { width: 844, height: 390 }],
    ['tablet-landscape', { width: 1024, height: 768 }],
  ]) {
    const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(baseUrl);
    await page.getByRole('button', { name: '自由练习', exact: true }).click();
    await page.getByRole('button', { name: '驶入赛道', exact: true }).click();
    await page.locator('#minimap').waitFor();
    const metrics = await page.evaluate(() => {
      const rect = selector => {
        const { x, y, width, height, bottom, top } = document.querySelector(selector).getBoundingClientRect();
        return { x, y, width, height, top, bottom };
      };
      const rank = rect('.position-panel');
      const map = rect('.map-panel');
      const controls = rect('[data-control="steer"]');
      return {
        coarsePointer: matchMedia('(pointer: coarse)').matches,
        landscape: matchMedia('(orientation: landscape)').matches,
        rank,
        map,
        controls,
        rankToMapGap: map.top - rank.bottom,
        mapToControlsGap: controls.top - map.bottom,
      };
    });
    assert.equal(metrics.coarsePointer, true, `${name}: expected a touch viewport`);
    assert.equal(metrics.landscape, true, `${name}: expected landscape orientation`);
    assert.ok(metrics.map.width <= 116, `${name}: minimap should be compact (${metrics.map.width}px)`);
    assert.ok(metrics.rankToMapGap >= 24, `${name}: rank and minimap need breathing room (${metrics.rankToMapGap}px)`);
    assert.ok(metrics.mapToControlsGap >= 10, `${name}: minimap should clear touch controls (${metrics.mapToControlsGap}px)`);
    assert.deepEqual(errors, [], `${name}: browser page errors`);
    await page.screenshot({ path: `artifacts/screenshots/${screenshotPrefix}${name}-map-spacing.png` });
    results.push({ name, ...metrics, pass: true });
    console.log(`PASS ${name}: map ${metrics.map.width.toFixed(0)}px, rank gap ${metrics.rankToMapGap.toFixed(0)}px, controls gap ${metrics.mapToControlsGap.toFixed(0)}px`);
    await context.close();
  }
  fs.writeFileSync('artifacts/browser-map-spacing.json', JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
