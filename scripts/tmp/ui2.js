const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1180,height:820}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto('file://'+process.cwd()+'/dist/index.html');await p.waitForTimeout(600);
await (await p.$('text=Castile')).click();await p.waitForTimeout(1500);
for (let i=0;i<6;i++){ const c=await p.$('#modal:not([hidden]) .card, #modal:not([hidden]) .draft-card, #modal:not([hidden]) button.btn'); if(!c) break; await c.click({force:true}); await p.waitForTimeout(900);} 
await p.screenshot({path:'/tmp/claude-0/-home-user-lasting-empires/05c1f48a-c3cb-55e5-8d71-7a1a4818f4dc/scratchpad/s3.png'});
for(let i=0;i<6;i++){await p.click('[aria-label="Zoom out"]');await p.waitForTimeout(150);}
await p.waitForTimeout(500);await p.screenshot({path:'/tmp/claude-0/-home-user-lasting-empires/05c1f48a-c3cb-55e5-8d71-7a1a4818f4dc/scratchpad/s4.png'});
await p.click('#modebtn');await p.waitForTimeout(300);await p.click('text=Religion');await p.waitForTimeout(500);await p.screenshot({path:'/tmp/claude-0/-home-user-lasting-empires/05c1f48a-c3cb-55e5-8d71-7a1a4818f4dc/scratchpad/s5.png'});
console.log('errors',errs.join('\n'));await b.close();})();
