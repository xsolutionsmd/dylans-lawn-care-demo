'use strict';
// Isolated browser regression suite; never uses live bookings or external APIs.
// See docs/DESIGN_REQUIREMENTS.md for optional development dependency setup.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {chromium, webkit} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '../dist');
const types = {'.html':'text/html','.css':'text/css','.js':'text/javascript','.woff2':'font/woff2','.webp':'image/webp','.svg':'image/svg+xml'};
const server = http.createServer((request,response) => {
  const url = new URL(request.url,'http://localhost');
  if (request.method !== 'GET') { response.writeHead(405); return response.end(); }
  if (url.pathname === '/api/public/config') {
    response.setHeader('content-type','application/json');
    return response.end(JSON.stringify({bookingEnabled:true,timeZone:'America/New_York',horizonDays:365,minNoticeHours:0,slotMinutes:60,estimateMinutes:15,services:[{id:'landscaping',name:'Landscaping'}]}));
  }
  if (url.pathname === '/api/public/slots') {
    response.setHeader('content-type','application/json');
    return response.end(JSON.stringify({slots:[],timeZone:'America/New_York'}));
  }
  const file = path.resolve(root,'.'+decodeURIComponent(url.pathname === '/'?'/index.html':url.pathname));
  if (!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()) {response.writeHead(404);return response.end();}
  response.setHeader('content-type',types[path.extname(file)]||'application/octet-stream');
  response.end(fs.readFileSync(file));
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base = 'http://127.0.0.1:'+server.address().port;
  let cases=0;
  try {
    for (const [name,engine] of Object.entries({chromium,webkit})) {
      const browser=await engine.launch({headless:true});
      try {
        const page=await browser.newPage({viewport:{width:390,height:844},locale:'en-US',hasTouch:true});
        const errors=[];page.on('pageerror',error=>errors.push(error.message));
        await page.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
        for (const width of [320,375,390,430,768,1440]) {
          await page.setViewportSize({width,height:844});
          for (const query of ['?service=landscaping','?type=estimate&service=landscaping']) {
            await page.goto(base+'/book.html'+query);
            await page.locator('#booking-form').waitFor({state:'visible'});
            for (const value of ['','2026-09-30']) {
              await page.locator('#appointment-date').fill(value);
              const problems=await page.evaluate(()=>{
                const issues=[];
                for(const el of document.querySelectorAll('.form-section input:not([type=radio]),.form-section select,.form-section textarea')) {
                  const card=el.closest('.form-section'),r=el.getBoundingClientRect(),c=card.getBoundingClientRect(),s=getComputedStyle(card);
                  const left=c.left+parseFloat(s.borderLeftWidth)+parseFloat(s.paddingLeft),right=c.right-parseFloat(s.borderRightWidth)-parseFloat(s.paddingRight);
                  if(r.left<left-1||r.right>right+1) issues.push({id:el.id,left:r.left,right:r.right,cardContent:[left,right]});
                  if(r.height<44) issues.push({id:el.id,height:r.height});
                }
                if(document.documentElement.scrollWidth>document.documentElement.clientWidth) issues.push('page overflow');
                return issues;
              });
              assert.deepEqual(problems,[],`${name} ${width} ${query} date=${value}`);
              assert.equal(await page.locator('#appointment-date').inputValue(),value);
              cases++;
            }
          }
        }
        await page.goto(base+'/');
        const homepage=await page.locator('body').innerText();
        assert.doesNotMatch(homepage,/\b0[1-4]\b|Reviews checked|Development demo|[↗↑↓]/);
        assert.deepEqual(await page.locator('#navigation a').allTextContents(),['Services','Reviews','Our work','Let’s talk ']);
        await page.getByRole('button',{name:'Next project',exact:true}).click();
        assert.match(await page.locator('#project-announcement').innerText(),/Care around every curve/);
        assert.equal(await page.locator('.project-card').count(),8);
        for (const width of [320,390,1440]) {
          await page.setViewportSize({width,height:844});
          const trigger=page.getByRole('link',{name:'View photograph: Fresh lines. A fresh start.',exact:true});
          await trigger.click();
          const dialog=page.getByRole('dialog');
          await dialog.waitFor({state:'visible'});
          assert.equal(await page.locator('#photo-title').innerText(),'Fresh lines. A fresh start.');
          if(process.env.DESIGN_SCREENSHOTS) {
            fs.mkdirSync(process.env.DESIGN_SCREENSHOTS,{recursive:true});
            await page.locator('.photo-detail img').evaluate(img=>img.decode());
            await page.screenshot({path:path.join(process.env.DESIGN_SCREENSHOTS,`${name}-photo-${width}.png`)});
          }
          assert.equal(await page.getByRole('button',{name:'Previous photograph',exact:true}).isDisabled(),true);
          await page.getByRole('button',{name:'Next photograph',exact:true}).click();
          assert.equal(await page.locator('#photo-title').innerText(),'Care around every curve.');
          await page.keyboard.press('ArrowRight');
          assert.equal(await page.locator('#photo-title').innerText(),'A wider view of good care.');
          for(let n=0;n<12;n++) {
            await page.keyboard.press('Tab');
            assert.equal(await page.evaluate(()=>document.querySelector('.photo-dialog').contains(document.activeElement)),true);
          }
          assert.equal(await page.evaluate(()=>{const d=document.querySelector('.photo-dialog'),r=d.getBoundingClientRect();return d.scrollWidth<=d.clientWidth+1&&r.left>=0&&r.right<=innerWidth;}),true);
          await page.keyboard.press('Escape');
          assert.equal(await dialog.isVisible(),false);
          assert.equal(await trigger.evaluate(el=>document.activeElement===el),true);
        }
        await page.emulateMedia({reducedMotion:'reduce'});
        await page.reload();
        assert.equal(await page.locator('html').evaluate(el=>el.classList.contains('motion-paused')),true);
        assert.deepEqual(errors,[],`${name} runtime errors`);
        console.log(`${name}: 24 booking containment cases, design constraints and gallery passed`);
      } finally {await browser.close();}
    }
    console.log(`PASS: ${cases} date/card layout cases across two browser engines.`);
  } finally {await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
