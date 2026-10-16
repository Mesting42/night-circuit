import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const base = process.argv[2] || 'http://localhost:5188/';
const production = !base.includes(':5188');
const browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--ignore-gpu-blocklist'] });
const reports = [];
fs.mkdirSync('artifacts/screenshots', { recursive: true });
try {
  for (const [name, width, height, mobile] of [
    ['phone', 844, 390, true],
    ['small-phone', 667, 375, true],
    ['compact-phone', 568, 320, true],
    ['tablet', 1024, 768, true],
    ['desktop', 1440, 900, false],
  ]) {
    const context = await browser.newContext({ viewport: { width, height }, isMobile: mobile, hasTouch: mobile });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base);
    await page.getByRole('button', { name: '设置', exact: true }).click();
    await page.locator('[data-setting="quality"]').selectOption('low');
    await page.locator('[data-setting="autoThrottle"]').uncheck();
    await page.getByRole('button', { name: '保存并返回', exact: true }).click();
    await page.getByRole('button', { name: '自由练习', exact: true }).click();
    await page.getByRole('button', { name: '驶入赛道', exact: true }).click();
    await page.locator('#minimap').waitFor();
    await page.evaluate(() => document.fonts.ready);
    const metrics = await page.evaluate(() => {
      const rect = selector => {
        const { left, right, top, bottom, width, height } = document.querySelector(selector).getBoundingClientRect();
        return { left, right, top, bottom, width, height };
      };
      return {
        rank: rect('.position-panel'), clock: rect('.clock-panel'), map: rect('.map-panel'), telemetry: rect('.telemetry'),
        steer: rect('[data-control="steer"]'), nitro: rect('[data-control="nitro"]'),
        throttle: rect('[data-control="throttle"]'), pedals: rect('.pedals'),
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    assert.equal(metrics.overflow, false, `${name}: horizontal overflow`);
    if (mobile) {
      assert.ok(metrics.map.width <= 116, `${name}: minimap too large`);
      assert.ok(metrics.map.top - metrics.clock.bottom >= 11, `${name}: map too close to clock`);
      assert.ok(metrics.map.left > width / 2, `${name}: map belongs at the top right`);
      assert.ok(metrics.nitro.right + 20 <= metrics.throttle.left, `${name}: boost needs horizontal separation`);
      assert.ok(metrics.nitro.bottom + 20 <= metrics.throttle.top, `${name}: boost needs vertical separation`);
      assert.ok(metrics.pedals.left - metrics.telemetry.right >= 7, `${name}: centered telemetry overlaps pedals`);
      for (const control of ['nitro', 'throttle']) {
        assert.ok(metrics[control].width >= 44 && metrics[control].height >= 44, `${name}: touch target too small`);
        assert.ok(metrics[control].left >= 0 && metrics[control].right <= width && metrics[control].top >= 0 && metrics[control].bottom <= height, `${name}: control outside screen`);
      }
      if (base.includes(':5188')) {
        await page.waitForFunction(() => window.__nightCircuit.snapshot()?.countdown <= 0);
        const cdp = await context.newCDPSession(page);
        const point = (r, id) => ({ x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2, id, radiusX: 9, radiusY: 9, force: 1 });
        const throttle = point(metrics.throttle, 1), nitro = point(metrics.nitro, 2);
        const touch = (type, touchPoints) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints });
        const input = () => page.evaluate(() => window.__nightCircuit.snapshot().player.input);
        await touch('touchStart', [throttle]);
        await page.waitForFunction(() => { const p = window.__nightCircuit.snapshot().player; return p.input.throttle === 1 && p.speed > 4; });
        assert.equal((await input()).throttle, 1, `${name}: throttle touch should remain active`);
        const fuelBefore = await page.evaluate(() => window.__nightCircuit.snapshot().player.nitro);
        await touch('touchStart', [throttle, nitro]);
        await page.waitForFunction(before => { const p = window.__nightCircuit.snapshot().player; return p.input.throttle === 1 && p.input.nitro === true && p.nitro < before; }, fuelBefore);
        assert.equal((await input()).throttle, 1);
        assert.equal((await input()).nitro, true);
        const fuelAfter = await page.evaluate(() => window.__nightCircuit.snapshot().player.nitro);
        assert.ok(fuelAfter < fuelBefore, `${name}: boost must consume fuel`);
        await touch('touchEnd', [nitro]);
        await page.waitForFunction(() => { const i = window.__nightCircuit.snapshot().player.input; return i.throttle === 1 && i.nitro === false; });
        assert.equal((await input()).throttle, 1);
        assert.equal((await input()).nitro, false);
        await touch('touchCancel', []);
        await page.waitForFunction(() => window.__nightCircuit.snapshot().player.input.throttle === 0);
        assert.equal((await input()).throttle, 0);
      }
    } else {
      assert.equal(await page.locator('.touch-controls').isVisible(), false);
      assert.equal(metrics.map.width, 150, 'desktop minimap stays compact below clock');
    }
    assert.deepEqual(errors, []);
    await page.screenshot({ path: `artifacts/screenshots/${production ? 'production-' : ''}pedal-spacing-${name}.png` });
    reports.push({ name, pass: true, base, metrics });
    console.log(`PASS ${name}: smaller minimap, separated pedals${mobile && base.includes(':5188') ? ', throttle + nitro hold/release' : ''}`);
    await context.close();
  }
  fs.writeFileSync(`artifacts/browser-pedal-spacing${production ? '-production' : ''}.json`, JSON.stringify(reports, null, 2));
} finally {
  await browser.close();
}
