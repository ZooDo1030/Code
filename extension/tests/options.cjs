const {chromium}=require('playwright');
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});let count=0;
 async function check(name,bootstrap,fn){const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  const html=fs.readFileSync(path.join(__dirname,'..','options.html'),'utf8').replace('<script src="options.js"></script>','');
  await page.setContent(html);
  await page.addScriptTag({content:`Object.defineProperty(window,'Translator',{value:undefined,writable:true,configurable:true});window.enabled=true;window.getPrefs=async()=>({enabled});window.setPrefs=async data=>{enabled=data.enabled};window.chrome={storage:{local:{get:()=>getPrefs(),set:data=>setPrefs(data)}}};(${bootstrap.toString()})();`});
  await page.addScriptTag({path:path.join(__dirname,'..','options.js')});await fn(page);
  await page.waitForTimeout(30);assert.deepEqual(errors,[]);count++;console.log('PASS options:',name);
 }finally{await page.close();}}
 try{
 await check('late initial settings cannot undo a newer toggle',()=>{
   let first=true;window.getPrefs=()=>{if(first){first=false;return new Promise(resolve=>window.oldRead=resolve)}return Promise.resolve({enabled})};
 },async page=>{
   await page.locator('#enabled').uncheck();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('暂停'));
   await page.evaluate(()=>oldRead({enabled:true}));await page.waitForTimeout(50);
   assert.equal(await page.locator('#enabled').isChecked(),false);
 });
 await check('storage read failure is visible and handled',()=>{window.getPrefs=async()=>{throw Error('storage failed')}},async page=>{
   await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('无法读取'));
 });
 await check('storage write failure restores saved state',()=>{window.setPrefs=async()=>{throw Error('write failed')}},async page=>{
   await page.locator('#enabled').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('未保存成功'));
   assert.equal(await page.locator('#enabled').isChecked(),true);assert.equal(await page.locator('#enabled').isEnabled(),true);
 });
 await check('native capability failure never leaves spinner',()=>{window.Translator={availability:async()=>{throw Error('denied')}}},async page=>{
   await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('无法读取'));
 });
 console.log(`Options audit completed: ${count} scenarios passed.`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
