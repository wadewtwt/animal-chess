import assert from 'node:assert/strict';
import {
  MATCH_DURATION_MAX_SECONDS,
  MATCH_DURATION_MIN_SECONDS,
  getMatchDuration,
  getMatchStatusText,
} from '../dist-test/MatchmakingConfig.js';

assert.equal(MATCH_DURATION_MIN_SECONDS, 3);
assert.equal(MATCH_DURATION_MAX_SECONDS, 5);
assert.equal(getMatchDuration(() => 0), 3);
assert.equal(getMatchDuration(() => 0.49), 4);
assert.equal(getMatchDuration(() => 0.999), 5);
assert.equal(getMatchDuration(() => 1), 5);
assert.equal(getMatchStatusText(0), '正在搜寻合适的对手');
assert.equal(getMatchStatusText(2), '正在确认对手信息');
assert.equal(getMatchStatusText(4), '即将进入对局');

console.log('matchmaking_config_test passed');
