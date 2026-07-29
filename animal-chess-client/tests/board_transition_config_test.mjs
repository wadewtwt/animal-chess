import assert from 'node:assert/strict';
import {
  BOARD_TRANSITION_CONFIG,
  getPieceCascadeDelay,
  getTransitionTitle,
} from '../dist-test/BoardTransitionConfig.js';

assert.equal(BOARD_TRANSITION_CONFIG.totalDurationSeconds, 0.92);
assert.equal(BOARD_TRANSITION_CONFIG.boardIntroScale, 0.9);
assert.equal(BOARD_TRANSITION_CONFIG.leafSweepCount, 10);

assert.equal(getPieceCascadeDelay(0), 0.18);
assert.equal(getPieceCascadeDelay(15), 0.405);
assert.equal(getPieceCascadeDelay(31), 0.645);

assert.equal(getTransitionTitle(false), '本地双人');
assert.equal(getTransitionTitle(true), '挑战开始');

console.log('board_transition_config_test passed');
