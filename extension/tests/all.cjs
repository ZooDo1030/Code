const {spawnSync} = require('node:child_process');
const path = require('node:path');
for (const file of ['smoke.cjs', 'audit.cjs', 'options.cjs']) {
  const result = spawnSync(process.execPath, [path.join(__dirname, file)], {stdio: 'inherit'});
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log('PASS all automated checks. Real model/network tests are separate: live-native.cjs.');
