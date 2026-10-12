// 반응(주스) 표 — game-builder juice 키트. 🔒 tools/check-juice.mjs 가 이 표를 읽는다.
// 행동마다 'sfx' 필수 + 서로 다른 갈래 ≥3. 표만 쓰고 안 부르면 반응 0 이므로
// BattleScene.ts 의 performAttackStrike/finishAttack/endBattle 에서 전부 J.fire() 로 부른다.
export const JUICE = {
  hit: ['sfx', 'combo', 'flash'], // 평타 명중 — 연속 공격일수록 콤보로 음이 올라간다
  crit: ['sfx', 'flash', 'hitstop', 'banner'], // 치명타 — 멈칫 + 큰 글자
  kill: ['sfx', 'slowmo', 'flash', 'banner'], // 적장 격파
  levelup: ['sfx', 'slowmo', 'banner', 'flash'], // 레벨업
  victory: ['sfx', 'banner', 'slowmo', 'flash'], // 전투 승리
};

// 행동 → 로드된 오디오 키(PreloadScene.preload 에서 this.load.audio 로 등록).
export const JUICE_SFX: Record<string, string> = {
  hit: 'sfx_hit',
  crit: 'sfx_crit',
  kill: 'sfx_kill',
  levelup: 'sfx_levelup',
  victory: 'sfx_victory',
};
