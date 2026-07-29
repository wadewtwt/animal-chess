import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const mainMenuSource = readFileSync(resolve(__dirname, '../assets/scripts/ui/MainMenuUI.ts'), 'utf8');
const lobbySource = readFileSync(resolve(__dirname, '../dev/ui-replica-pro/src/components/LobbyViews.tsx'), 'utf8');

for (const expected of [
  'isStartTransitioning',
  'playStartGameTransition',
  'StartTransitionOverlay',
  'StartTransitionLeaf',
  '穿过森林',
]) {
  assert.match(mainMenuSource, new RegExp(expected), `Cocos 开始游戏过渡缺少关键元素: ${expected}`);
}

for (const expected of [
  'startTransitioning',
  'handleStartGameTransition',
  '森林入口正在打开',
  'transition-delay',
]) {
  assert.match(lobbySource, new RegExp(expected), `React 开始游戏过渡缺少关键元素: ${expected}`);
}

console.log('start_transition_visual_test passed');
