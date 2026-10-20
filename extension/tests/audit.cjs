const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
async function main() {
  const browser = await chromium.launch({executablePath: '/usr/bin/chromium', args: ['--no-sandbox']});
  let count = 0;
  async function open(bootstrap = () => {}, body = '') {
    const context = await browser.newContext(); const page = await context.newPage(); const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('https://www.pinterest.com/**', route => route.fulfill({contentType: 'text/html', body:
      '<!doctype html><html><body><header style="padding:20px"><input data-test-id="search-box-input" style="width:60vw;height:44px"></header>' + body + '</body></html>'}));
    await page.goto('https://www.pinterest.com/');
    await page.addScriptTag({content: `
      Object.defineProperty(window,'Translator',{value:undefined,writable:true,configurable:true});
      window.requests=[];window.__enabled=true;window.__get=async()=>({enabled:__enabled});
      window.__send=async m=>({translation:'translated reference'});
      window.chrome={storage:{local:{get:()=>__get()},onChanged:{addListener:fn=>window.onStorageChange=fn}},
      runtime:{sendMessage:async m=>{requests.push(m);return __send(m)}}};
      (${bootstrap.toString()})();`});
    await page.addScriptTag({path: path.join(__dirname, '..', 'content.js')});
    const cdp = await context.newCDPSession(page);
    const tree = await cdp.send('DOM.getDocument', {depth: -1, pierce: true});
    function find(n) {if (n.attributes?.includes('xunci-extension')) return n; for (const c of [...n.children || [], ...n.shadowRoots || []]) {const r = find(c); if (r) return r;}}
    const host = find(tree.root); const {object} = await cdp.send('DOM.resolveNode', {nodeId: host.shadowRoots[0].nodeId});
    const run = async fn => {
      const result = await cdp.send('Runtime.callFunctionOn', {objectId: object.objectId, functionDeclaration: fn, returnByValue: true});
      if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails)); return result.result.value;
    };
    return {page, context, errors, run, input: page.locator('input[data-test-id="search-box-input"]'),
      async click(selector) {const rect = await run(`function(){const r=this.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}}`); await page.mouse.click(rect.x, rect.y);}};
  }
  async function check(name, bootstrap, fn, body) {
    const h = await open(bootstrap, body);
    try {await fn(h); await h.page.waitForTimeout(50); assert.deepEqual(h.errors, []); count++; console.log('PASS audit:', name);}
    finally {await h.context.close();}
  }
  const text = h => h.run('function(){return this.querySelector(".translation").textContent}');
  const hidden = h => h.run('function(){return this.querySelector(".box").classList.contains("hidden")}');
  try {
    await check('delayed initial pause settings never send text', () => {window.__get=async()=>{await new Promise(r=>setTimeout(r,700));return {enabled:false};};}, async h => {
      await h.input.fill('乌龟'); await h.page.waitForTimeout(950);
      assert.equal(await h.page.evaluate(()=>requests.length),0); assert.equal(await hidden(h),true);
      await h.page.evaluate(()=>onStorageChange({enabled:{newValue:true}},'local')); await h.page.waitForTimeout(650);
      assert.equal(await h.page.evaluate(()=>requests.length),1);
    });
    await check('stale async native detection cannot send old input online', () => {
      window.Translator={availability:async()=>{await new Promise(r=>setTimeout(r,900));return 'unavailable';}};
    }, async h => {
      await h.input.fill('旧词');await h.page.waitForTimeout(600);await h.input.fill('新词');await h.page.waitForTimeout(1600);
      assert.deepEqual(await h.page.evaluate(()=>requests.map(m=>m.text)),['新词']);
    });
    await check('native API rejection falls back once; no raw exception', () => {
      window.Translator={availability:async()=>{throw Error('private internal error');}};
    }, async h => {
      await h.input.fill('乌龟');await h.page.waitForTimeout(700);assert.match(await text(h),/translated reference/);
      assert.equal(await h.page.evaluate(()=>requests.length),1);
    });
    await check('failed native translator is destroyed and recreated', () => {
      window.creates=0;window.destroyed=0;
      window.Translator={availability:async()=> 'available',create:async()=>{
        const first=++creates===1;return {translate:async()=>{if(first)throw Error('broken model');return 'local turtle';},destroy(){destroyed++;}};
      }};
    }, async h => {
      await h.input.fill('乌龟');await h.page.waitForTimeout(650);assert.match(await text(h),/translated reference/);
      await h.input.fill('海龟');await h.page.waitForTimeout(650);assert.match(await text(h),/local turtle/);
      assert.equal(await h.page.evaluate(()=>destroyed),1);assert.equal(await h.page.evaluate(()=>requests.length),1);
    });
    await check('hung native translation times out instead of indefinite spinner', () => {
      const original=setTimeout;window.setTimeout=(fn,ms,...args)=>original(fn,ms===20000?60:ms,...args);
      window.destroyed=0;window.Translator={availability:async()=> 'available',create:async()=>({translate:()=>new Promise(()=>{}),destroy(){destroyed++;}})};
    }, async h => {
      await h.input.fill('乌龟');await h.page.waitForTimeout(750);
      assert.match(await h.run('function(){return this.querySelector(".status").textContent}'),/超时/);
      assert.equal(await h.page.evaluate(()=>requests.length),0);assert.equal(await h.page.evaluate(()=>destroyed),1);
    });
    await check('synchronous model creation failure; retry keeps user activation', () => {
      window.attempts=0;window.activation=false;
      window.Translator={availability:async()=> 'downloadable',create:()=>{activation=navigator.userActivation.isActive;
        if(++attempts===1)throw Error('download failed');return Promise.resolve({translate:async()=> 'turtle'});}};
    }, async h => {
      await h.input.fill('乌龟');await h.page.waitForTimeout(650);await h.click('.setup');await h.page.waitForTimeout(80);
      assert.match(await h.run('function(){return this.querySelector(".status").textContent}'),/下载/);
      await h.click('.retry');await h.page.waitForTimeout(650);assert.equal(await text(h),'turtle ↗');
      assert.equal(await h.page.evaluate(()=>activation),true);
    });
    await check('download progress and completion respect Escape dismissal', () => {
      window.Translator={availability:async()=> 'downloadable',create:opts=>{opts.monitor({addEventListener:(name,fn)=>window.progress=fn});
        return new Promise(resolve=>window.finishDownload=()=>resolve({translate:async()=> 'turtle'}));}};
    }, async h => {
      await h.input.fill('乌龟');await h.page.waitForTimeout(650);await h.click('.setup');await h.input.focus();await h.input.press('Escape');
      await h.page.evaluate(()=>{progress({loaded:.5});finishDownload();});await h.page.waitForTimeout(700);assert.equal(await hidden(h),true);
    });
    await check('model download timeout is recoverable', () => {
      const original=setTimeout;window.setTimeout=(fn,ms,...args)=>original(fn,ms===120000?60:ms,...args);
      window.Translator={availability:async()=> 'downloadable',create:()=>new Promise(()=>{})};
    }, async h => {
      await h.input.fill('乌龟');await h.page.waitForTimeout(650);await h.click('.setup');await h.page.waitForTimeout(120);
      assert.match(await h.run('function(){return this.querySelector(".status").textContent}'),/未能下载/);
      assert.equal(await h.run('function(){return this.querySelector(".retry").classList.contains("hidden")}'),false);
    });
    await check('pause aborts download and releases a late native model', () => {
      window.destroyed=0;
      window.Translator={availability:async()=> 'downloadable',create:()=>new Promise(resolve=>window.finishDownload=()=>resolve({translate:async()=> 'turtle',destroy(){destroyed++;}}))};
    }, async h => {
      await h.input.fill('乌龟');await h.page.waitForTimeout(650);await h.click('.setup');
      await h.page.evaluate(()=>{onStorageChange({enabled:{newValue:false}},'local');finishDownload();});
      await h.page.waitForTimeout(100);assert.equal(await hidden(h),true);assert.equal(await h.page.evaluate(()=>destroyed),1);
    });
    await check('pause during in-flight result prevents resurfacing', () => {
      window.__send=()=>new Promise(resolve=>window.finishRequest=()=>resolve({translation:'late turtle'}));
    }, async h => {
      await h.input.fill('乌龟');await h.page.waitForTimeout(650);
      await h.page.evaluate(()=>{onStorageChange({enabled:{newValue:false}},'local');finishRequest();});
      await h.page.waitForTimeout(100);assert.equal(await hidden(h),true);
    });
    await check('unrelated combobox ignored; host and search replacement recovered', () => {}, async h => {
      await h.page.locator('#other').fill('不要翻译');await h.page.waitForTimeout(650);assert.equal(await h.page.evaluate(()=>requests.length),0);
      await h.page.evaluate(()=>{document.querySelector('#xunci-extension').remove();
        const old=document.querySelector('[data-test-id="search-box-input"]');const next=old.cloneNode();next.value='乌龟';old.replaceWith(next);});
      await h.page.waitForTimeout(750);assert.equal(await h.page.locator('#xunci-extension').count(),1);assert.match(await text(h),/translated/);
    }, '<input id="other" role="combobox" style="width:200px">');
    await check('encoded output remains text and does not load external markup', () => {
      window.__send=async()=>({translation:'Tom &amp; Jerry <img src="https://leak.example/x">',encoded:true});
    }, async h => {
      let leaks=0;await h.page.route('https://leak.example/**',r=>{leaks++;return r.abort();});
      await h.input.fill('图案');await h.page.waitForTimeout(650);
      assert.match(await text(h),/Tom & Jerry <img/);assert.equal(leaks,0);
      assert.equal(await h.run('function(){return this.querySelectorAll("img").length}'),0);
    });
    await check('extension reload errors are actionable and do not crash', () => {
      window.__send=()=>{throw Error('Extension context invalidated.');};
    }, async h => {
      await h.input.fill('乌龟');await h.page.waitForTimeout(650);
      assert.match(await h.run('function(){return this.querySelector(".status").textContent}'),/刷新 Pinterest/);
      await h.page.evaluate(()=>window.__send=async()=>({error:'请从浏览器工具栏打开寻词'}));
      await h.click('.settings');await h.page.waitForTimeout(50);
      assert.match(await h.run('function(){return this.querySelector(".status").textContent}'),/工具栏/);
    });
    await check('duplicate scripts are inert; a different extension gets a visible warning', () => {}, async h => {
      await h.page.addScriptTag({path:path.join(__dirname,'..','content.js')});
      assert.equal(await h.page.locator('#xunci-extension').count(),1);
      assert.equal(await h.page.locator('#xunci-duplicate-warning').count(),0);
      await h.page.evaluate(()=>document.querySelector('#xunci-extension').dataset.xunciOwner='old-extension');
      await h.page.addScriptTag({path:path.join(__dirname,'..','content.js')});
      assert.equal(await h.page.locator('#xunci-duplicate-warning').count(),1);
      assert.match(await h.page.locator('#xunci-duplicate-warning').getAttribute('aria-label'),/多个寻词版本/);
      await h.input.fill('乌龟');await h.page.waitForTimeout(650);assert.equal(await h.page.evaluate(()=>requests.length),1);
    });
    await check('long and rare Han input; narrow viewport bubble stays visible', () => {}, async h => {
      await h.page.setViewportSize({width:360,height:300});
      await h.input.fill('中'.repeat(151));assert.match(await h.run('function(){return this.querySelector(".status").textContent}'),/150/);
      assert.equal(await h.page.evaluate(()=>requests.length),0);
      await h.input.fill('\u{20000}');await h.page.waitForTimeout(650);assert.match(await text(h),/translated/);
      const r=await h.run('function(){const r=this.querySelector(".box").getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom}}');
      assert.ok(r.x>=0&&r.y>=0&&r.right<=360&&r.bottom<=300,JSON.stringify(r));
    });
    console.log(`Browser fault audit completed: ${count} scenarios passed.`);
  } finally {await browser.close();}
}
main().catch(error=>{console.error(error);process.exit(1);});
