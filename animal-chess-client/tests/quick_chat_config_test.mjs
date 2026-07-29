import assert from 'node:assert/strict';
import {
  QUICK_CHAT_PHRASES,
  QUICK_CHAT_STICKERS,
} from '../dist-test-dev/QuickChatConfig.js';

assert.equal(QUICK_CHAT_PHRASES.length >= 8, true, '至少需要 8 条常用短语');
assert.equal(QUICK_CHAT_STICKERS.length >= 8, true, '至少需要 8 个表情包');

const allItems = [...QUICK_CHAT_PHRASES, ...QUICK_CHAT_STICKERS];
const ids = new Set(allItems.map((item) => item.id));

assert.equal(ids.size, allItems.length, '快捷聊天 id 必须唯一');

for (const item of QUICK_CHAT_PHRASES) {
  assert.equal(item.kind, 'phrase');
  assert.equal(item.label.length <= 8, true, `${item.id} 短语按钮文案过长`);
  assert.equal(item.message.length <= 12, true, `${item.id} 气泡文案过长`);
}

for (const item of QUICK_CHAT_STICKERS) {
  assert.equal(item.kind, 'sticker');
  assert.equal(item.emoji.length <= 4, true, `${item.id} 表情主体过长`);
  assert.equal(item.message.length <= 10, true, `${item.id} 表情说明过长`);
}

console.log('quick_chat_config_test passed');
