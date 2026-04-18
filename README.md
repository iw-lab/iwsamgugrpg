# 漢祖再興記 · 한조재흥기

> 유비(劉備) 중심의 헌작풍 턴제 SRPG.
> 복숭아꽃 아래의 맹세로 시작해 한실(漢室) 재흥까지.

<p align="center"><b>영걸전 DNA + Fire Emblem 감성의 오리지널 SRPG</b></p>

---

## 개요

- **장르**: 2D 턴제 전략 RPG (그리드)
- **엔진**: Phaser 3.90 · TypeScript 5.9 · Vite 6
- **플랫폼**: 웹 브라우저 (PWA 지원)
- **세이브**: localStorage · 3슬롯
- **언어**: 한국어
- **에셋**: OpenGameArt CC0/CC-BY-SA 기반 + 프로시저럴 생성 (저작권 안전)
- **분량**: 4장 · 20전투 · 40장수 · 35책략 · 28아이템

## 플레이

### 로컬에서 실행

```bash
pnpm install
pnpm dev
# http://localhost:5173 접속
```

### 빌드 · 배포

```bash
pnpm build       # dist/ 생성
pnpm preview     # 로컬 미리보기
# Vercel / Netlify / GitHub Pages 에 dist/ 업로드
```

## 조작

| 키 | 동작 |
|---|---|
| 좌클릭 | 유닛 선택 · 이동 지점 · 공격 대상 |
| ESC | 취소 · 이전 상태로 |
| TAB | 다음 유닛 커서 |
| ENTER | 턴 종료 · 대사 진행 |
| F1 | 도움말 |
| F5 / F9 | 저장 / 불러오기 |

## 시스템

### 병종 상성
- 보병 → 궁병 (1.5x)
- 궁병 → 기병 (1.5x)
- 기병 → 보병 (1.5x)
- 책사 → 호위 약간 유리, 자객 → 책사 강함

### 지형 효과
- 평지/도로: 기본
- 숲: 기병 이동 3배, 회피 +15%, 방어 +2
- 산: 보병/책사/기병 이동 3배, 기병은 거의 통과 불가, 회피 +25%, 방어 +4
- 강: 모두 통과 불가 (책략/다리 필요)
- 다리: 회피 -10%, 방어 -2 (병목)
- 성벽: 통과 불가
- 성문: 통과 가능 (점령 목표가 되는 곳)

### 피해 계산

```
damage = floor((atk × (0.9~1.1) × classAdvantage × skillPower) - (def + terrainDef) × 0.55)
crit = 4% + intel × 0.5%
```

### 난이도
- **관대**: 적 HP 80%, 공격 85%, 경험치 +20% (스토리 감상용)
- **보통**: 영걸전 원작과 유사
- **엄격**: 적 HP 135%, 공격 120%, 경험치 -15%

### 성장
- 레벨업 시 HP/공격/방어/지력 랜덤 성장 (장수별 성장폭)
- 아이템 장비로 스탯 보정
- 적장 처치 시 대량 경험치

## 스토리 — 4장 20전투

### 제1장 — 도원결의
1. 탁군의 거사 (황건적 토벌)
2. 사수관 전투 (관우, 화웅을 베다)
3. 호뢰관 삼영전 (유관장 vs 여포)
4. 서주 구원 (간옹 영입)
5. 소패 공방전 (여포와의 악연)

### 제2장 — 유랑의 세월
1. 여남에서의 재기 (조운 영입)
2. 박망파 화공 (제갈량의 첫 계)
3. 신야의 방화
4. 장판파의 고함
5. 손권과의 동맹

### 제3장 — 천하삼분지계
1. **적벽대전** (동남풍)
2. 형주 4군 평정 (황충·위연 영입)
3. 성도 입성 (마초 영입)
4. 정군산 (하후연 처단)
5. **맥성 구원 — 운명의 분기**

### 제4장 — 분기 엔딩
**진엔딩 (관우 구원 분기)**
1. 가정 전투 (강유 영입)
2. 오장원 최후의 결전
3. 낙양 입성 (한조재흥)

**배드엔딩 (복수 분기)**
1. 이릉대전 (육손의 화공)

## 장수 40명

### 촉군 (20명)
유비·관우·장비·조운·황충·마초·제갈량·방통·위연·간옹·손건·미축·미방·마량·관평·장포·강유·요화·왕평 · 그 외

### 위군 (10명)
조조·하후돈·하후연·허저·장료·서황·장합·사마의·전위·곽가

### 오군 (7명)
손권·주유·육손·노숙·감녕·태사자·여몽

### 기타 (3명)
장각(황건) · 화웅(한) · 여포(한)

## 개발

```bash
pnpm typecheck   # TS 검사
pnpm test:run    # 단위 테스트 (vitest)
pnpm format      # prettier
```

## 프로젝트 구조

```
yungkuljun-game/
├── src/
│   ├── config/      balance.ts, constants.ts
│   ├── types/       TypeScript 인터페이스
│   ├── systems/     DataRegistry, GameState, AI, MapLoader, UnitFactory, AssetGenerator
│   ├── scenes/      Boot/Preload/Title/Dialogue/WorldMap/BattlePrep/Battle/BattleUI/Ending/Settings
│   ├── utils/       pathfinding (A*), damage, rng
│   └── main.ts      진입점
├── public/data/     generals/battles/skills/items/dialogue JSON
├── tests/unit/      vitest
└── dist/            빌드 산출물
```

## 저작권

- 코에이 테크모 『삼국지 영걸전』의 **IP·일러스트·BGM·UI 일절 미사용**
- 역사 인물명(유비·관우 등)은 퍼블릭 도메인
- 이름 "한조재흥기"는 오리지널. "영걸전" 표기 없음
- 에셋: Phaser Graphics API로 프로시저럴 생성 + 향후 OpenGameArt CC0 에셋 교체 가능
- 폰트: Google Fonts (Nanum Myeongjo, Cinzel) — OFL

## 크레딧

- 개발: Claude Code + 심필굿
- 역사 고증: 삼국지 연의 · 삼국지 정사
- 게임 디자인 DNA: 영걸전 시리즈 (참조만), Fire Emblem, Advance Wars, Into the Breach

---

*"같은 해 같은 달 같은 날에 태어나기를 바라지 않으되,*
*다만 같은 해 같은 달 같은 날에 죽기를 원하노라."*
