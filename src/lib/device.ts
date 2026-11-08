import type { BodyLayer, Grade } from './layers';
import type { AngleReading } from './reading';

export const READING_KEY = 'biketrue.reading';
export const SITTER_KEY = 'biketrue.sitter';
export const VISIT_KEY = 'biketrue.visit';
export const NOTICE_KEY = 'biketrue.notice';
export const INSTALL_KEY = 'biketrue.install';

export type VisitDraft = {
  name: string;
  phone: string;
  comment: string;
  dayChoice: '' | 'today' | 'tomorrow' | 'custom';
  customDate: string;
  time: string;
};

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function isoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function parseReading(raw: string | null): { reading: AngleReading; hadTop: boolean } | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const reading: AngleReading = {
      knee: num(parsed.knee),
      back: num(parsed.back),
      arm: num(parsed.arm),
      hip: num(parsed.hip),
    };
    if (!Object.values(reading).some((value) => value !== null)) return null;
    return { reading, hadTop: parsed.hadTopPhoto === true };
  } catch {
    return null;
  }
}

export function parseVisitDraft(raw: string | null): VisitDraft | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const day = parsed.dayChoice;
    const customDate = str(parsed.customDate);
    const time = str(parsed.time);
    return {
      name: str(parsed.name).slice(0, 80),
      phone: str(parsed.phone).slice(0, 40),
      comment: str(parsed.comment).slice(0, 1000),
      dayChoice: day === 'today' || day === 'tomorrow' || day === 'custom' ? day : '',
      customDate: isoDate(customDate) ? customDate : '',
      time: /^\d{2}:\d{2}$/.test(time) ? time : '',
    };
  } catch {
    return null;
  }
}

export function readReading(): { reading: AngleReading; hadTop: boolean } | null {
  try {
    const local = localStorage.getItem(READING_KEY);
    if (local) return parseReading(local);
    const legacy = sessionStorage.getItem(READING_KEY);
    if (!legacy) return null;
    localStorage.setItem(READING_KEY, legacy);
    sessionStorage.removeItem(READING_KEY);
    return parseReading(legacy);
  } catch {
    return null;
  }
}

export function writeReading(reading: AngleReading, hadTop: boolean) {
  try {
    if (!Object.values(reading).some((value) => typeof value === 'number')) {
      localStorage.removeItem(READING_KEY);
      return;
    }
    localStorage.setItem(READING_KEY, JSON.stringify({ ...reading, hadTopPhoto: hadTop }));
  } catch {
    /* private mode */
  }
}

export type SitterWho = 'me' | 'other';

export type SitterSlot = {
  name: string;
  height: string;
  body: BodyLayer;
};

export type SitterDraft = {
  who: SitterWho;
  me: SitterSlot;
  other: SitterSlot;
};

const GRADES: Grade[] = ['easy', 'reach', 'effort', 'cant'];

function emptySlot(): SitterSlot {
  return { name: '', height: '', body: {} };
}

function readSlot(value: unknown): SitterSlot {
  if (!value || typeof value !== 'object') return emptySlot();
  const record = value as Record<string, unknown>;
  const name = typeof record.name === 'string' ? record.name.slice(0, 40) : '';
  const height = typeof record.height === 'string' && /^\d{0,3}$/.test(record.height) ? record.height : '';
  const source = record.body && typeof record.body === 'object' ? record.body as Record<string, unknown> : {};
  const body: BodyLayer = {};
  for (const key of ['posterior', 'hip', 'ankle', 'shoulder'] as const) {
    const grade = source[key];
    if (typeof grade === 'string' && GRADES.includes(grade as Grade)) body[key] = grade as Grade;
  }
  return { name, height, body };
}

export function emptySitter(): SitterDraft {
  return { who: 'me', me: emptySlot(), other: emptySlot() };
}

export function readSitter(): SitterDraft {
  try {
    const raw = localStorage.getItem(SITTER_KEY);
    if (!raw) return emptySitter();
    const value = JSON.parse(raw) as Record<string, unknown>;
    return {
      who: value.who === 'other' ? 'other' : 'me',
      me: readSlot(value.me),
      other: readSlot(value.other),
    };
  } catch {
    return emptySitter();
  }
}

export function writeSitter(draft: SitterDraft) {
  try {
    const blank = draft.who === 'me'
      && !Object.keys(draft.me.body).length
      && !draft.other.name
      && !draft.other.height
      && !Object.keys(draft.other.body).length;
    if (blank) {
      localStorage.removeItem(SITTER_KEY);
      return;
    }
    localStorage.setItem(SITTER_KEY, JSON.stringify(draft));
  } catch {
    /* private mode */
  }
}
