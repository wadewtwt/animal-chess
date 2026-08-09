import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(__dirname, '../assets/scripts/ui/MainMenuProfileOverlay.ts'), 'utf8');
const mainMenuSource = readFileSync(resolve(__dirname, '../assets/scripts/ui/MainMenuUI.ts'), 'utf8');
const onTapSource = source.slice(
  source.indexOf('this.nativeButton.onTap'),
  source.indexOf('private destroyNativeButton'),
);
const createNativeButtonSource = source.slice(
  source.indexOf('private createNativeButton()'),
  source.indexOf('private destroyNativeButton'),
);
const hideIndex = onTapSource.indexOf('this.hide();');
const timeoutIndex = onTapSource.indexOf('setTimeout');
const authorizedIndex = onTapSource.indexOf('this.onAuthorized');

assert.ok(hideIndex >= 0, '点击授权按钮后必须关闭授权弹层');
assert.ok(timeoutIndex < 0 || hideIndex < timeoutIndex, '授权弹层必须立即关闭，不能依赖延时回调');
assert.ok(hideIndex < authorizedIndex, '授权弹层必须在执行外部业务回调前关闭');
assert.match(createNativeButtonSource, /text: '授权微信昵称'/, '微信原生按钮必须显示真实授权文案');
assert.match(createNativeButtonSource, /backgroundColor: '#2b8735'/, '微信原生按钮必须使用可见背景');
assert.match(createNativeButtonSource, /color: '#ffffff'/, '微信原生按钮文字必须可见');
assert.match(createNativeButtonSource, /lineHeight: height/, '微信原生按钮文字必须在点击区域内垂直居中');
assert.doesNotMatch(source, /createAuthButton/, '不能保留没有授权事件的 Cocos 假按钮');
assert.match(source, /label\.string = '完善微信资料'/, '弹层标题不能与授权按钮文案重复');

const signInProfileSource = mainMenuSource.slice(
  mainMenuSource.indexOf('private showProfileAuthorizationForSignIn()'),
  mainMenuSource.indexOf('private async submitSignIn'),
);
assert.match(
  mainMenuSource,
  /private signInProfileOverlay: MainMenuProfileOverlay \| null = null;/,
  '签到授权弹层必须保存唯一实例',
);
assert.match(
  signInProfileSource,
  /if \(!this\.signInProfileOverlay\)/,
  '重复触发签到授权时必须复用已有弹层',
);
assert.equal(
  signInProfileSource.match(/new MainMenuProfileOverlay/g)?.length,
  1,
  '签到授权流程只能包含一个弹层创建入口',
);

console.log('profile_overlay_dismissal_test passed');
