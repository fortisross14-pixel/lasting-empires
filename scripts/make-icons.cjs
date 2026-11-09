const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const svg = fs.readFileSync('scripts/icon.svg', 'utf8');
  for (const [n, pad] of [[192, 0], [512, 0], [180, 0], [512, 1]]) {
    await p.setViewportSize({ width: n, height: n });
    const inner = pad ? `<div style="width:${n}px;height:${n}px;background:#efe8d6;display:grid;place-items:center"><div style="width:${n * 0.8}px;height:${n * 0.8}px">${svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div></div>` : svg.replace('<svg ', `<svg width="${n}" height="${n}" `);
    await p.setContent(`<html><body style="margin:0">${inner}</body></html>`);
    await p.screenshot({ path: `icons/${pad ? 'maskable-' : 'icon-'}${n}.png`, omitBackground: false });
  }
  await b.close();
})();
