// 타입 선언 — kit/juice/juice.js(정본, 수정 금지) 는 평범한 JS 라 allowJs 추론이 'table'·'sfx'
// 처럼 기본값 없는 destructuring 프로퍼티를 놓친다. 같은 이름의 .d.ts 를 옆에 둬 정확한 타입을 준다.
export type JuiceChannel =
  | 'sfx'
  | 'combo'
  | 'pop'
  | 'burst'
  | 'punch'
  | 'flash'
  | 'slowmo'
  | 'hitstop'
  | 'banner'
  | 'haptic'
  | 'kick';

export const CHANNELS: JuiceChannel[];

export function validateJuiceTable(table: Record<string, JuiceChannel[]>): string[];

export interface JuiceFireOptions {
  x?: number;
  y?: number;
  n?: number;
  text?: string;
  title?: string;
  color?: string;
  big?: number;
  vol?: number;
  sfx?: string;
  comboColor?: string;
  flashColor?: string;
  flashAlpha?: number;
  slowSec?: number;
  stopSec?: number;
  bannerSec?: number;
  vib?: number[];
  burstColor?: string;
  punch?: string | Element | Array<string | Element>;
  [key: string]: unknown;
}

export interface Juice {
  readonly combo: number;
  fire(action: string, o?: JuiceFireOptions): void;
  time(dt: number): number;
  pop(text: string, x: number, y: number, color?: string, big?: number): void;
  punch(sel: string | Element, big?: number): void;
  flash(color?: string, a?: number): void;
  banner(text: string, color?: string, sec?: number): void;
  destroy(): void;
}

export interface CreateJuiceOptions {
  table: Record<string, JuiceChannel[]>;
  host?: HTMLElement;
  sfx?: (name: string, opts: { rate: number; vol: number }) => void;
  burst?: (o: JuiceFireOptions & { action: string; mult: number; big: number }) => void;
  kick?: (o: JuiceFireOptions & { action: string; mult: number; big: number }) => void;
  punch?: Record<string, string | string[]>;
  haptics?: () => boolean;
  comboWindow?: number;
}

export function createJuice(options: CreateJuiceOptions): Juice;
