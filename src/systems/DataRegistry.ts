import type { Battle, General, Item, Skill, DialogueScene } from '@/types';

export class DataRegistry {
  private static instance: DataRegistry | null = null;
  generals: Map<string, General> = new Map();
  skills: Map<string, Skill> = new Map();
  items: Map<string, Item> = new Map();
  battles: Map<string, Battle> = new Map();
  dialogue: Map<string, DialogueScene> = new Map();
  private ready = false;

  static get(): DataRegistry {
    if (!this.instance) this.instance = new DataRegistry();
    return this.instance;
  }

  isReady(): boolean {
    return this.ready;
  }

  async loadAll(): Promise<void> {
    if (this.ready) return;

    const base = import.meta.env.BASE_URL || './';
    const fetchJson = async <T>(path: string): Promise<T> => {
      const res = await fetch(`${base}data/${path}`);
      if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
      return res.json();
    };

    const [generals, skills, items, battles] = await Promise.all([
      fetchJson<General[]>('generals.json'),
      fetchJson<Skill[]>('skills.json'),
      fetchJson<Item[]>('items.json'),
      fetchJson<Battle[]>('battles.json'),
    ]);

    generals.forEach((g) => this.generals.set(g.id, g));
    skills.forEach((s) => this.skills.set(s.id, s));
    items.forEach((i) => this.items.set(i.id, i));
    battles.forEach((b) => this.battles.set(b.id, b));

    const dialogueFiles = ['ch1.json', 'ch2.json', 'ch3.json', 'ch4.json'];
    for (const f of dialogueFiles) {
      try {
        const scenes = await fetchJson<Record<string, DialogueScene>>(`dialogue/${f}`);
        Object.values(scenes).forEach((s) => this.dialogue.set(s.id, s));
      } catch (e) {
        console.warn(`Dialogue file ${f} not found, skipping`);
      }
    }

    this.ready = true;
    console.log(
      `[DataRegistry] Loaded: ${this.generals.size} generals, ${this.skills.size} skills, ` +
        `${this.items.size} items, ${this.battles.size} battles, ${this.dialogue.size} dialogues`,
    );
  }

  getGeneral(id: string): General {
    const g = this.generals.get(id);
    if (!g) throw new Error(`Unknown general: ${id}`);
    return g;
  }

  getSkill(id: string): Skill {
    const s = this.skills.get(id);
    if (!s) throw new Error(`Unknown skill: ${id}`);
    return s;
  }

  getItem(id: string): Item {
    const i = this.items.get(id);
    if (!i) throw new Error(`Unknown item: ${id}`);
    return i;
  }

  getBattle(id: string): Battle {
    const b = this.battles.get(id);
    if (!b) throw new Error(`Unknown battle: ${id}`);
    return b;
  }

  getDialogue(id: string): DialogueScene | null {
    return this.dialogue.get(id) ?? null;
  }
}
