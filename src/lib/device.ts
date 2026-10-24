import type { AngleReading } from './reading';

export const READING_KEY = 'biketrue.reading';
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
