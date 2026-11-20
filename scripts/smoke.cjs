// Drives the built game (dist/index.html) in a headless browser at tablet and phone size: every deck window and tab,
// the side panels, the menu, a card, turns and skip-ahead, the missions screens and the battle test.
// Fails on any page error or sideways scroll, and writes the screenshots to docs/screens/ (not kept in git).
//   npm run build && npm run smoke
// Needs Playwright with Chromium (preinstalled in Claude Code cloud sessions; elsewhere: npm i -D playwright).
const path = require('node:path');
let chromium, devices;
try { ({ chromium, devices } = require('playwright')); } catch { console.error('Playwright is not installed: npm i -D playwright && npx playwright install chromium'); process.exit(2); }
const PAGE = 'file://' + path.resolve(__dirname, '../dist/index.html');
const OUT = path.resolve(__dirname, '../docs/screens');
const SIZES = [['tablet', { viewport: { width: 1180, height: 820 }, deviceScaleFactor: 1 }], ['phone', { ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }]];
const problems = [];

async function run(browser, name, opts) {
  const ctx = await browser.newContext(opts);
  const p = await ctx.newPage();
  p.on('pageerror', e => problems.push(`${name}: page error: ${e.message}`));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) problems.push(`${name}: console: ${m.text()}`); });
  await p.addInitScript(() => { try { localStorage.setItem('lasting-empires.unlock-all', '1'); } catch { /* */ } });
  await p.goto(PAGE); await p.waitForTimeout(700);
  const wait = (ms = 350) => p.waitForTimeout(ms);
  const check = async what => { const [w, v] = await p.evaluate(() => [document.documentElement.scrollWidth, innerWidth]); if (w > v) problems.push(`${name}: ${what}: the page scrolls sideways (${w} > ${v})`); };
  const shot = async what => { await wait(); await check(what); await p.screenshot({ path: path.join(OUT, `${name}-${what}.png`) }); };
  const tap = async (sel, what = sel) => { try { await p.locator(sel).first().click({ timeout: 4000 }); await wait(); return true; } catch { problems.push(`${name}: could not tap ${what}`); return false; } };
  /** Answer whatever the game asks, the first way offered. */
  const answer = async () => { for (let i = 0; i < 16; i++) { const open = await p.evaluate(() => { const m = document.querySelector('#modal'); if (!m || m.hidden) return false; (m.querySelector('.btn.opt:not(.blocked)') || m.querySelector('.mbox .btn.primary') || m.querySelector('.mbox .card:not(.back)') || m.querySelector('.mbox button'))?.click(); return true; }); if (!open) return; await wait(600); } problems.push(`${name}: a dialog would not close`); };
  const closeWin = async () => { await p.evaluate(() => { const w = document.querySelector('#win'); if (w && !w.hidden) w.querySelector('.win-head .iconbtn')?.click(); }); await wait(200); };

  await shot('title');
  // missions and one mission's page
  await tap('.missions-b', 'Missions'); await shot('missions');
  await tap('.mcard >> nth=0', 'a mission card'); await shot('mission');
  await tap('.pick-top .btn', 'back to missions'); await tap('.pick-top .btn', 'back to title');
  // the open game
  await tap('text=Open game'); await shot('picker');
  await p.locator('#tutcheck').uncheck().catch(() => {});
  await tap('.pick-panel .btn.primary', 'Play'); await wait(700); await answer();
  await shot('game');
  // every deck and every tab in it
  for (let d = 0; d < 6; d++) {
    await tap(`#tabs .tab >> nth=${d}`, `deck ${d}`);
    const tabs = await p.locator('#win .win-tab').count();
    for (let t = 0; t < tabs; t++) { await tap(`#win .win-tab >> nth=${t}`, `deck ${d} tab ${t}`); await check(`deck ${d} tab ${t}`); if (t === 0 && d === 0) await shot('cards'); if (d === 3 && t === 1) await shot('goods'); if (d === 4 && t === 1) await shot('research'); }
    await closeWin();
  }
  // a card: where it can go, then back out
  await tap('#tabs .tab >> nth=2', 'Internal deck');
  if (await p.locator('#win .win-body .card').count()) { await tap('#win .win-body .card >> nth=0', 'a card'); await shot('card'); await p.keyboard.press('Escape'); await wait(); }
  await p.evaluate(() => { const m = document.querySelector('#modal'); if (m && !m.hidden) (m.querySelector('.iconbtn') || m.querySelector('.btn.ghost'))?.click(); }); await wait();
  await closeWin();
  // a province, by tapping the middle of the map
  const box = await p.locator('#board').boundingBox();
  await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await shot('province');
  await p.evaluate(() => document.querySelector('#sheet .iconbtn')?.click()); await wait();
  // the menu and everything in it
  const rows = ['Tasks under way', 'Realm and ruler', 'Chronicle', 'Settings'];
  for (const r of rows) {
    await tap('.menu-b', 'Menu'); if (r === rows[0]) await shot('menu');
    await tap(`.gm-row >> text=${r}`, r); if (r === 'Chronicle') await shot('chronicle'); if (r === 'Settings') await shot('settings');
    await p.evaluate(() => { const m = document.querySelector('#modal'); if (m && !m.hidden) m.querySelector('.btn.primary, .iconbtn')?.click(); document.querySelector('#sheet:not([hidden]) .iconbtn')?.click(); }); await wait();
  }
  // turns: the list of things to do, then six turns and three skips
  await tap('#endturn', 'End Turn'); await shot('todo'); await answer();
  for (let i = 0; i < 6; i++) { await p.evaluate(() => document.querySelector('#endturn').click()); await wait(1300); await answer(); }
  for (let i = 0; i < 3; i++) { await p.evaluate(() => document.querySelector('.skip-b')?.click()); await wait(700); await answer(); }
  await shot('later');
  // back to the title, then the battle test
  await tap('.menu-b', 'Menu'); await tap('#modal .btn.ghost', 'Save and exit');
  await tap('summary >> text=Test scenarios'); await tap('.howto .btn.wide', 'the battle test'); await wait(700); await answer();
  await tap('#tabs .tab >> nth=0', 'Military deck');
  if (await p.locator('#win .win-body .card').count()) { await tap('#win .win-body .card >> nth=0', 'March Orders'); await shot('targets'); }
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch();
  for (const [name, opts] of SIZES) await run(browser, name, opts);
  await browser.close();
  if (problems.length) { console.log(problems.join('\n')); console.log(`${problems.length} problem(s)`); process.exit(1); }
  console.log('Smoke test passed at tablet and phone size. Screens are in docs/screens/.');
})();
