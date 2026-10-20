const {chromium}=require('playwright');
const path=require('node:path');
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
(async()=>{
 const ext=path.resolve(__dirname,'..');
 await require('./service.cjs')();
 const instance=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const browser=await instance.newContext();
 try {
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://www.pinterest.com/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><body><header style="padding:20px"><input data-test-id="search-box-input" style="width:60vw;height:44px"></header></body></html>'}));
 await page.goto('https://www.pinterest.com/');
 await page.addScriptTag({content:`Object.defineProperty(window,'Translator',{value:undefined,writable:true,configurable:true});window.requests=[];window.chrome={storage:{local:{get:async()=>({enabled:true})},onChanged:{addListener:fn=>window.onStorageChange=fn}},runtime:{sendMessage:async m=>{requests.push(m);if(m.text==='慢请求'){await new Promise(r=>setTimeout(r,1100));return {translation:'Old translation'}}if(m.text==='失败测试')return {error:'翻译服务暂不可用'};return {translation:m.text==='水彩森林小屋'?'A watercolor cottage in the forest':m.text==='花瓶'?'vase':m.text==='玻璃'?'glass':m.text==='水彩'?'watercolor':'A glass without flowers'}}}}`});
 await page.addScriptTag({path:path.join(ext,'content.js')});
 const cdp=await browser.newCDPSession(page);
 const tree=await cdp.send('DOM.getDocument',{depth:-1,pierce:true});
 function find(n){if(n.attributes?.includes('xunci-extension'))return n;for(const c of [...n.children||[],...n.shadowRoots||[]]){const r=find(c);if(r)return r;}}
 const host=find(tree.root);assert.ok(host?.shadowRoots?.[0]);
 const {object}=await cdp.send('DOM.resolveNode',{nodeId:host.shadowRoots[0].nodeId});
 const run=async fn=>{const r=await cdp.send('Runtime.callFunctionOn',{objectId:object.objectId,functionDeclaration:fn,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const search=page.locator('input');
 await search.fill('玻璃');await search.fill('水彩森林小屋');await page.waitForTimeout(750);
 assert.equal(await page.evaluate(()=>requests.length),1);
 assert.equal(await run('function(){return this.querySelector(".translation").textContent}'),'A watercolor cottage in the forest ↗');
 assert.equal(await run('function(){return this.querySelectorAll("textarea,select,.generate,.item").length}'),0);
 await search.fill('慢请求');await page.waitForTimeout(650);await search.fill('花瓶');await page.waitForTimeout(1300);
 assert.equal(await run('function(){return this.querySelector(".translation").textContent}'),'vase ↗');
 await search.fill('不要玻璃杯');await page.waitForTimeout(650);
 assert.equal(await run('function(){return this.querySelector(".translation").textContent}'),'A glass without flowers ↗');
 await search.fill('失败测试');await page.waitForTimeout(650);
 assert.match(await run('function(){return this.querySelector(".status").textContent}'),/暂不可用/);
 assert.equal(await run('function(){return this.querySelector(".retry").classList.contains("hidden")}'),false);
 await search.fill('');assert.equal(await run('function(){return this.querySelector(".box").classList.contains("hidden")}'),true);
 const before=await page.evaluate(()=>requests.length);
 await search.dispatchEvent('compositionstart');await search.fill('水彩');await page.waitForTimeout(650);assert.equal(await page.evaluate(()=>requests.length),before);
 await search.dispatchEvent('compositionend');await page.waitForTimeout(650);assert.equal(await page.evaluate(()=>requests.length),before+1);
 await search.fill('plain English');assert.equal(await run('function(){return this.querySelector(".box").classList.contains("hidden")}'),true);
 // Quota-free native path: one-time activation, then automatic translation with no remote request.
 await page.evaluate(()=>{window.nativeActive=false;window.Translator={availability:async()=>window.nativeActive?'available':'downloadable',create:async()=>{window.activated=navigator.userActivation.isActive;window.nativeActive=true;return {translate:async text=>text==='乌龟'?'turtle':'glass'}}}});
 const onlineBefore=await page.evaluate(()=>requests.length);
 await search.fill('乌龟');await page.waitForTimeout(650);
 assert.equal(await run('function(){return this.querySelector(".setup").classList.contains("hidden")}'),false);
 const rect=await run('function(){const r=this.querySelector(".setup").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}}');
 await page.mouse.click(rect.x,rect.y);await page.waitForTimeout(750);
 assert.equal(await page.evaluate(()=>window.activated),true);
 assert.equal(await run('function(){return this.querySelector(".translation").textContent}'),'turtle ↗');
 assert.equal(await page.evaluate(()=>requests.length),onlineBefore);
 // Native value clears without dispatching an input event (the screenshot regression).
 await search.evaluate(el=>{el.value=''});await page.waitForTimeout(500);
 assert.equal(await run('function(){return this.querySelector(".box").classList.contains("hidden")}'),true);
 await page.evaluate(()=>onStorageChange({enabled:{newValue:false}},'local'));
 await search.fill('乌龟');await page.waitForTimeout(650);
 assert.equal(await run('function(){return this.querySelector(".box").classList.contains("hidden")}'),true);
 await page.evaluate(()=>onStorageChange({enabled:{newValue:true}},'local'));await page.waitForTimeout(650);
 assert.equal(await run('function(){return this.querySelector(".translation").textContent}'),'turtle ↗');
 await search.press('Escape');await page.waitForTimeout(600);
 assert.equal(await run('function(){return this.querySelector(".box").classList.contains("hidden")}'),true);
 await search.fill('玻璃');await page.waitForTimeout(650);
 const navigation=page.waitForURL('**/search/pins/**');await run('function(){this.querySelector(".translation").click()}');await navigation;
 assert.equal(new URL(page.url()).searchParams.get('q'),'glass');assert.deepEqual(errors,[]);
 console.log('PASS browser fixture: automatic single translation, debounce, IME input, stale responses ignored, errors/retry/empty/English handling, native enablement with activation, no online calls for local translation, pause, silent clear, Escape, direct current-tab search');
 }finally{await instance.close();}
})().catch(e=>{console.error(e);process.exit(1)});
