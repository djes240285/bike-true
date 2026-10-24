export type Point = { x: number; y: number; visibility?: number };

export const VISIBILITY_MIN = 0.5;

export function seen(points: Point[], min = VISIBILITY_MIN): boolean {
  return points.length > 0 && points.every((point) => (point.visibility ?? 0) >= min);
}

export function angleAt(a: Point, b: Point, c: Point): number | null {
  const abx = a.x - b.x;
  const aby = a.y - b.y;
  const cbx = c.x - b.x;
  const cby = c.y - b.y;
  const mag = Math.hypot(abx, aby) * Math.hypot(cbx, cby);
  if (mag === 0) return null;
  const cos = Math.min(1, Math.max(-1, (abx * cbx + aby * cby) / mag));
  return (Math.acos(cos) * 180) / Math.PI;
}

/** Наклон корпуса к горизонту: 0 — горизонталь, 90 — вертикаль. */
export function torsoInclinationDeg(shoulder: Point, hip: Point): number | null {
  const dx = Math.abs(shoulder.x - hip.x);
  const dy = Math.abs(shoulder.y - hip.y);
  if (dx === 0 && dy === 0) return null;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

export function meanVisibility(points: Point[]): number {
  if (points.length === 0) return 0;
  return points.reduce((sum, point) => sum + (point.visibility ?? 0), 0) / points.length;
}
