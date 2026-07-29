import assert from 'node:assert/strict';
import {
  ACTION_FRAME_COUNT,
  ANIMAL_ACTION_CONFIGS,
  getActionFramePaths,
} from '../dist-test/ui/PieceActionConfig.js';

assert.equal(ACTION_FRAME_COUNT, 8);
assert.equal(ANIMAL_ACTION_CONFIGS.length, 8);

const names = ANIMAL_ACTION_CONFIGS.map((item) => item.name);
assert.deepEqual(names, [
  'rat',
  'cat',
  'dog',
  'wolf',
  'leopard',
  'tiger',
  'lion',
  'elephant',
]);

assert.deepEqual(getActionFramePaths('lion'), [
  'animal_actions/lion/show_00/spriteFrame',
  'animal_actions/lion/show_01/spriteFrame',
  'animal_actions/lion/show_02/spriteFrame',
  'animal_actions/lion/show_03/spriteFrame',
  'animal_actions/lion/show_04/spriteFrame',
  'animal_actions/lion/show_05/spriteFrame',
  'animal_actions/lion/show_06/spriteFrame',
  'animal_actions/lion/show_07/spriteFrame',
]);

for (const config of ANIMAL_ACTION_CONFIGS) {
  assert.equal(config.frameDuration > 0, true, `${config.name} frameDuration must be positive`);
  assert.equal(config.fallbackMotion.length, ACTION_FRAME_COUNT, `${config.name} fallback frame count`);
}

console.log('piece_action_config_test passed');
