const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1800,height:800}});
await p.goto('file:///tmp/claude-0/-home-user-lasting-empires/05c1f48a-c3cb-55e5-8d71-7a1a4818f4dc/scratchpad/world.svg');await p.screenshot({path:'/tmp/claude-0/-home-user-lasting-empires/05c1f48a-c3cb-55e5-8d71-7a1a4818f4dc/scratchpad/world.png'});
await p.setViewportSize({width:1000,height:700});await p.evaluate(()=>{document.querySelector('svg').setAttribute('viewBox','1700 280 450 300');document.querySelector('svg').setAttribute('width','1000')});await p.screenshot({path:'/tmp/claude-0/-home-user-lasting-empires/05c1f48a-c3cb-55e5-8d71-7a1a4818f4dc/scratchpad/europe.png'});await b.close();})();
