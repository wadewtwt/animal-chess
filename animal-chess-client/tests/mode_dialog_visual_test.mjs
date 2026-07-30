import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cocosSource = readFileSync(resolve(__dirname, '../assets/scripts/ui/ModeSelectionUI.ts'), 'utf8');
const reactSource = readFileSync(resolve(__dirname, '../dev/ui-replica-pro/src/components/Modals.tsx'), 'utf8');

for (const expected of ['createDifficultyOptionIcon', '难度徽章', '开始挑战图标', '取消图标']) {
  assert.match(cocosSource, new RegExp(expected), `Cocos 难度弹窗缺少统一图标元素: ${expected}`);
}

for (const expected of ['Bot', 'Leaf', 'Target', 'Swords', 'XCircle']) {
  assert.match(reactSource, new RegExp(expected), `React 难度弹窗缺少 Lucide 图标: ${expected}`);
}

assert.match(reactSource, /开始挑战/, 'React 难度弹窗应保留确认文案');
assert.match(cocosSource, /开始挑战/, 'Cocos 难度弹窗应保留确认文案');

const roomActionDialogSource = cocosSource.slice(
  cocosSource.indexOf('private showRoomActionDialog()'),
  cocosSource.indexOf('private createRoomActionButton(')
);

for (const expected of ["'#06190f'", "'PanelShadow'", "'TopBand'", 'closeTrans.setContentSize(80, 80)', "'HeaderRoom'"]) {
  assert.ok(roomActionDialogSource.includes(expected), `Cocos 房间对战弹窗风格应与难度弹窗统一: ${expected}`);
}

console.log('mode_dialog_visual_test passed');
