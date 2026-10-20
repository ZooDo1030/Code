// Uses the real browser API and real model download. No Translator mocks.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const context = await chromium.launchPersistentContext('/tmp/xunci-native-audit', {
    executablePath:'/usr/bin/chromium', headless:true, args:['--no-sandbox'], ignoreDefaultArgs:['--disable-component-update']});
  try {
    const page = await context.newPage();
    // Only the secure test document is a fixture. Chrome's model download is real.
    await page.route('https://www.pinterest.com/**', r => r.fulfill({contentType:'text/html',body:'<button id="enable">Enable real translation</button>'}));
    await page.goto('https://www.pinterest.com/');
    const availability = await page.evaluate(async () => typeof Translator === 'undefined' ? 'missing' : Translator.availability({sourceLanguage:'zh',targetLanguage:'en'}));
    console.log('Real native API availability:', availability);
    assert.notEqual(availability,'missing');assert.notEqual(availability,'unavailable');
    await page.evaluate(() => {
      window.result = null;
      document.querySelector('#enable').onclick = async () => {
        try {
          const translator = await Translator.create({sourceLanguage:'zh',targetLanguage:'en',signal:AbortSignal.timeout(120000)});
          const words = ['乌龟','透明的玻璃花瓶','不要花朵的图案'];const translations=[];
          for (const text of words) translations.push({text,translation:await translator.translate(text)});
          window.result={translations};translator.destroy();
        } catch(error) {window.result={error:error.name,message:error.message};}
      };
    });
    await page.click('#enable');
    await page.waitForFunction(() => window.result, null, {timeout:125000});
    const result = await page.evaluate(() => window.result); console.log(JSON.stringify(result));
    assert.ok(result.translations,'Real model setup/translation did not complete');
    for (const item of result.translations) assert.ok(item.translation && !/\p{Script=Han}/u.test(item.translation));
    console.log('PASS real native model setup and three Chinese-to-English translations');
  } finally {await context.close();}
})().catch(error=>{console.error(error);process.exit(1);});
