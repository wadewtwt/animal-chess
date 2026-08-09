import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(__dirname, '../assets/scripts/ui/BoardView.ts'), 'utf8');
const showMainMenuSource = source.slice(
  source.indexOf('private showMainMenu()'),
  source.indexOf('private showModeSelection()'),
);
const createInGameUISource = source.slice(
  source.indexOf('private createInGameUI()'),
  source.indexOf('private decorateTurnIndicator()'),
);

assert.match(
  showMainMenuSource,
  /this\.hideQuickChatDialog\(\);/,
  '进入主菜单前必须关闭快捷表达弹窗',
);
assert.match(
  showMainMenuSource,
  /if \(this\.quickChatButtonNode\) this\.quickChatButtonNode\.active = false;/,
  '进入主菜单前必须隐藏快捷表达按钮',
);
assert.equal(
  createInGameUISource.match(/new Node\("QuickChatButton"\)/g)?.length,
  1,
  '对局 UI 只能创建一个快捷表达按钮，避免失去引用的按钮继续响应触摸',
);

console.log('main_menu_quick_chat_visibility_test passed');
