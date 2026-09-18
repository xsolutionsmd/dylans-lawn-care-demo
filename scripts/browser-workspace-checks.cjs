'use strict';
// Synthetic read-only owner workspace and customer navigation checks.
// No real accounts, settings, calendar, emails, or customer writes are touched.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const admin = path.resolve(__dirname, '../booking/web');
const settings = {businessName:'Dylan’s Lawn Care',timeZone:'America/New_York',slotMinutes:60,estimateMinutes:15,bufferMinutes:15,externalBufferMinutes:30,minNoticeHours:12,horizonDays:30,weekly:[1,2,3,4,5].map(weekday=>({weekday,start:'09:00',end:'17:00'})),exceptions:[{date:'2026-12-24',closed:false,start:'09:00',end:'12:00'}],blockedWeekly:[{weekday:3,allDay:false,start:'12:00',end:'13:00'}],blockedDates:[{date:'2026-12-25',allDay:true}]};
const bookings = [{id:'fixture-job',kind:'service',serviceId:'lawn-care',name:'Sample Customer',phone:'410-555-0100',email:'customer@example.test',address:'Example property',start:'2026-10-02T13:00:00Z',end:'2026-10-02T14:00:00Z',status:'needs_followup',calendarStatus:'synced',notes:'Please use the side gate.',adminNotes:'',createdAt:'2026-09-18T15:00:00Z'}];
function respond(request,response) {
  const pathname = new URL(request.url,'http://localhost').pathname;
  const api = {
    '/api/admin/session':{authenticated:true,role:'operator',actorEmail:'owner@example.test',csrfToken:'synthetic',canManageAccess:true,canConnectCalendar:true,google:{configured:true,connected:true,email:'owner@example.test',mode:'web'},publicOrigin:'http://localhost'},
    '/api/admin/settings':settings,
    '/api/admin/bookings':{bookings},
    '/api/admin/members':{members:[{id:'fixture-owner',email:'owner@example.test',role:'operator',calendarOwner:true,canRemove:false}]},
    '/api/admin/invitations':{invitations:[]},
    '/api/admin/email':{connection:{connected:true,canConnect:true,email:'owner@example.test'},settings:{enabled:false,remindersEnabled:false,reminderHours:24},history:[]}
  };
  if (api[pathname]) {response.setHeader('content-type','application/json');response.end(JSON.stringify(api[pathname]));return true;}
  const files = {'/admin/':'index.html','/admin.css':'admin.css','/admin.js':'admin.js','/admin/fonts/dm-sans.woff2':'admin/fonts/dm-sans.woff2','/admin/fonts/newsreader.woff2':'admin/fonts/newsreader.woff2'};
  if (!files[pathname]) return false;
  const file=path.join(admin,files[pathname]);
  response.setHeader('content-type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.woff2':'font/woff2'})[path.extname(file)]);
  response.end(fs.readFileSync(file));return true;
}
async function screenshot(page,name,label) {
  if (!process.env.DESIGN_SCREENSHOTS) return;
  fs.mkdirSync(process.env.DESIGN_SCREENSHOTS,{recursive:true});
  await page.screenshot({path:path.join(process.env.DESIGN_SCREENSHOTS,`${name}-${label}.png`),fullPage:true,animations:'disabled'});
}
async function run(page,base,name) {
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.setViewportSize({width:390,height:844});
  await page.goto(base+'/book.html?service=landscaping');
  await page.locator('#booking-form').waitFor({state:'visible'});
  await page.locator('#customer-name').fill('Sample Customer');
  await page.locator('#customer-notes').fill('Please keep these details.');
  const timeOrigin=await page.evaluate(()=>performance.timeOrigin);
  await page.locator('[data-booking-kind=estimate]').click();
  await page.waitForFunction(()=>location.search.includes('type=estimate'));
  assert.equal(await page.evaluate(()=>performance.timeOrigin),timeOrigin,'Mode switch must not reload the document');
  assert.match(await page.locator('#appointment-description').innerText(),/^15-minute/);
  assert.equal(await page.locator('#service').inputValue(),'landscaping');
  assert.equal(await page.locator('#customer-name').inputValue(),'Sample Customer');
  await page.goBack();
  await page.waitForFunction(()=>document.querySelector('#booking-modes').dataset.kind==='service');
  assert.match(await page.locator('#appointment-description').innerText(),/^60-minute/);
  await page.goForward();
  await page.waitForFunction(()=>document.querySelector('#booking-modes').dataset.kind==='estimate');
  assert.equal(await page.locator('#customer-notes').inputValue(),'Please keep these details.');
  assert.equal(await page.evaluate(()=>performance.timeOrigin),timeOrigin);
  await page.locator('[data-booking-kind=service]').focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.querySelector('#booking-modes').dataset.kind==='service');
  await screenshot(page,name,'booking-switch-390');

  // Delayed stale availability must never overwrite the newly selected kind.
  let releaseOld;
  await page.route('**/api/public/slots?**',async route=>{
    const u=new URL(route.request().url());
    const date=u.searchParams.get('date');
    const data={date,timeZone:'America/New_York',slots:[{start:date+'T13:00:00Z',end:date+(u.searchParams.get('kind')==='estimate'?'T13:15:00Z':'T14:00:00Z')}]};
    if(u.searchParams.get('kind')==='service') await new Promise(resolve=>{releaseOld=resolve;});
    try {await route.fulfill({json:data});} catch { /* Superseded fetch may have been aborted. */ }
  });
  await page.locator('#appointment-date').evaluate(el=>{el.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.waitForFunction(()=>document.querySelector('#available-times').getAttribute('aria-busy')==='true');
  await page.locator('[data-booking-kind=estimate]').click();
  await page.locator('.time-choice').first().waitFor();
  releaseOld?.();
  await page.locator('.time-choice').first().click();
  assert.equal(await page.locator('.time-choice input:checked').count(),1);
  // Selection must be cleared even if the two kinds offer the same start time.
  await page.unroute('**/api/public/slots?**');
  await page.locator('[data-booking-kind=service]').click();
  assert.equal(await page.locator('.time-choice input:checked').count(),0);
  assert.equal(await page.locator('#selection-summary').isVisible(),false);
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.locator('#booking-modes').evaluate(el=>getComputedStyle(el,'::before').transitionDuration),'0s');

  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto(base+'/admin/');
  await page.locator('#portal').waitFor({state:'visible'});
  await page.waitForFunction(()=>!document.querySelector('#settings-fields').disabled);
  await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.evaluate(()=>document.fonts.check('16px "DM Sans"')&&document.fonts.check('40px Newsreader')),true);
  for (const width of [320,375,390,430,768,1024,1440]) {
    await page.setViewportSize({width,height:900});
    for (const panel of ['bookings','availability','calendar','emails','access']) {
      await page.locator(`[data-panel=${panel}]`).first().click();
      await page.locator(`#${panel}-panel`).waitFor({state:'visible'});
      const issues=await page.evaluate(()=>{
        const issues=[];
        if(document.documentElement.scrollWidth>innerWidth+1) issues.push('page overflow');
        for(const el of document.querySelectorAll('.workspace-panel:not([hidden]) input,.workspace-panel:not([hidden]) select,.workspace-panel:not([hidden]) textarea,.time-window button')) {
          if(!el.checkVisibility()) continue;
          const card=el.closest('.panel');if(!card) continue;
          const r=el.getBoundingClientRect(),c=card.getBoundingClientRect(),s=getComputedStyle(card);
          const left=c.left+parseFloat(s.paddingLeft)+parseFloat(s.borderLeftWidth),right=c.right-parseFloat(s.paddingRight)-parseFloat(s.borderRightWidth);
          if(r.left<left-1||r.right>right+1) issues.push({element:el.outerHTML.slice(0,100),bounds:[r.left,r.right],card:[left,right]});
          if(el.type!=='checkbox'&&r.height<44) issues.push('small target '+el.outerHTML.slice(0,80));
        }
        for(const row of document.querySelectorAll('.time-window')) {
          if(!row.checkVisibility()) continue;
          const parts=[...row.children].map(el=>el.getBoundingClientRect());
          for(let i=1;i<parts.length;i++) for(let j=0;j<i;j++) {
            if(Math.min(parts[i].right,parts[j].right)>Math.max(parts[i].left,parts[j].left)+1&&Math.min(parts[i].bottom,parts[j].bottom)>Math.max(parts[i].top,parts[j].top)+1) issues.push('time row overlap');
          }
          for(const input of row.querySelectorAll('input[type=time]')) if(input.getBoundingClientRect().width<110) issues.push('native time editor too narrow for AM/PM');
        }
        return issues;
      });
      assert.deepEqual(issues,[],`${name} admin ${panel} ${width}`);
      if([320,390,1440].includes(width)&&['bookings','availability','calendar'].includes(panel)) await screenshot(page,name,`admin-${panel}-${width}`);
      if(process.env.DESIGN_SCREENSHOTS&&panel==='availability'&&[320,390].includes(width)) await page.locator('.weekly-day[data-weekday="1"]').screenshot({path:path.join(process.env.DESIGN_SCREENSHOTS,`${name}-time-row-${width}.png`)});
    }
  }
  await page.setViewportSize({width:390,height:844});
  await page.locator('[data-panel=availability]').click();
  const monday=page.locator('.weekly-day[data-weekday="1"]');
  await monday.getByRole('button',{name:'Add hours for Monday'}).click();
  assert.equal(await monday.locator('.time-window').count(),2);
  await monday.getByRole('button',{name:'Remove Monday time window'}).last().click();
  assert.equal(await monday.locator('.time-window').count(),1);
  await monday.locator('input[type=checkbox]').uncheck();
  assert.equal(await monday.locator('.day-slots').isVisible(),false);
  await monday.locator('input[type=checkbox]').check();
  assert.equal(await monday.locator('input[type=time]').first().inputValue(),'09:00');
  assert.equal(await page.locator('#settings-state').innerText(),'Unsaved changes');
  await page.locator('[data-panel=bookings]').first().click();
  await page.locator('.request-row button').first().click();
  await page.locator('#booking-dialog').waitFor({state:'visible'});
  await screenshot(page,name,'admin-dialog-390');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#booking-dialog').isVisible(),false);
  console.log(`${name}: in-place modes, history, preserved drafts, slot invalidation, reduced motion, 35 admin layouts and availability controls passed`);
}
module.exports={respond,run};
