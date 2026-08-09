const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const builderConfigPath = path.resolve(
  __dirname,
  '../animal-chess-client/profiles/v2/packages/builder.json',
);

const builderConfig = JSON.parse(fs.readFileSync(builderConfigPath, 'utf8'));
const wechatCommonConfig = builderConfig.common ?? {};
const packageBuilderConfigPath = path.resolve(
  __dirname,
  '../animal-chess-client/settings/v2/packages/builder.json',
);
const packageBuilderConfig = JSON.parse(fs.readFileSync(packageBuilderConfigPath, 'utf8'));
const miniGameBundleConfig =
  packageBuilderConfig.bundleConfig?.custom?.default?.configs?.miniGame ?? {};

assert.equal(
  wechatCommonConfig.platform,
  'wechatgame',
  'builder common platform should stay on wechatgame',
);

assert.equal(
  wechatCommonConfig.mainBundleIsRemote,
  false,
  'wechatgame main bundle must stay local to avoid startup dependence on remote tmp config files',
);

assert.equal(
  miniGameBundleConfig.overwriteSettings?.wechatgame?.isRemote,
  false,
  'wechatgame bundle default should keep asset bundles local during startup',
);
