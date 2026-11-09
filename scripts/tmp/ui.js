const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1180,height:820}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto('file://'+process.cwd()+'/dist/index.html');await p.waitForTimeout(800);
const btns=await p.$$eval('button',bs=>bs.map(b=>b.textContent.trim()).filter(Boolean).slice(0,20));console.log(btns.join(' | '));
await p.screenshot({path:'/tmp/claude-0/-home-user-lasting-empires/05c1f48a-c3cb-55e5-8d71-7a1a4818f4dc/scratchpad/s1.png'});
// start as castile
const start=await p.$('text=Castile');if(start){await start.click();await p.waitForTimeout(400);}
const go=await p.$('button:has-text("Begin")')||await p.$('button:has-text("Play")')||await p.$('button:has-text("Start")');if(go){await go.click();}
await p.waitForTimeout(1200);await p.screenshot({path:'/tmp/claude-0/-home-user-lasting-empires/05c1f48a-c3cb-55e5-8d71-7a1a4818f4dc/scratchpad/s2.png'});
console.log('errors',errs.join('\n'));await b.close();})();
