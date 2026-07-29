import assert from 'node:assert/strict';
import {
  ACTION_FRAME_COUNT,
  ANIMAL_ACTION_CONFIGS,
  getActionFramePaths,
  hasCompleteActionFrameSet,
} from '../dist-test/ui/PieceActionConfig.js';

assert.equal(ACTION_FRAME_COUNT, 10);
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
  'animal_actions/lion/roar_00/spriteFrame',
  'animal_actions/lion/roar_01/spriteFrame',
  'animal_actions/lion/roar_02/spriteFrame',
  'animal_actions/lion/roar_03/spriteFrame',
  'animal_actions/lion/roar_04/spriteFrame',
  'animal_actions/lion/roar_05/spriteFrame',
  'animal_actions/lion/roar_06/spriteFrame',
  'animal_actions/lion/roar_07/spriteFrame',
  'animal_actions/lion/roar_08/spriteFrame',
  'animal_actions/lion/roar_09/spriteFrame',
]);

for (const config of ANIMAL_ACTION_CONFIGS) {
  assert.equal(config.frameDuration, 0.06, `${config.name} must finish its 10-frame roar in 0.60 seconds`);
  assert.equal(config.fallbackMotion.length, ACTION_FRAME_COUNT, `${config.name} fallback frame count`);
}

assert.equal(hasCompleteActionFrameSet(ACTION_FRAME_COUNT), true);
assert.equal(hasCompleteActionFrameSet(ACTION_FRAME_COUNT - 1), false);

console.log('piece_action_config_test passed');
