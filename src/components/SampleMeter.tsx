import { useEffect, useState } from 'react';
import { dict, type Locale } from '../i18n';

const KEYS = ['knee', 'back', 'arm', 'hip'] as const;

const TRACK = {
  knee: { min: 120, max: 170, low: 140, high: 150 },
  back: { min: 10, max: 70, low: 35, high: 50 },
  arm: { min: 125, max: 185, low: 150, high: 165 },
  hip: { min: 30, max: 90, low: 55, high: 70 },
} as const;

const POSES: Record<(typeof KEYS)[number], number>[] = [
  { knee: 146, back: 42, arm: 158, hip: 62 },
  { knee: 131, back: 36, arm: 161, hip: 76 },
  { knee: 161, back: 49, arm: 151, hip: 46 },
  { knee: 144, back: 27, arm: 139, hip: 57 },
  { knee: 149, back: 61, arm: 174, hip: 68 },
];

function place(key: (typeof KEYS)[number], value: number) {
  const track = TRACK[key];
  const span = track.max - track.min;
  const pct = (point: number) => ((point - track.min) / span) * 100;
  return {
    from: pct(track.low),
    width: pct(track.high) - pct(track.low),
    mark: Math.min(96, Math.max(4, pct(value))),
    inside: value >= track.low && value <= track.high,
  };
}

export default function SampleMeter({ locale }: { locale: Locale }) {
  const t = dict[locale];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % POSES.length), 2800);
    return () => window.clearInterval(timer);
  }, []);

  const pose = POSES[index];

  return (
    <div className="meter" aria-hidden="true">
      <header>
        <span className="live"><i></i>{t.home.sample}</span>
        <em className="meter-pose">{t.home.samplePoses[index]}</em>
      </header>
      {KEYS.map((key) => {
        const spot = place(key, pose[key]);
        return (
          <div className={`meter-row${spot.inside ? '' : ' is-out'}`} key={key}>
            <span>{t.angles[key].label}<small>{t.angles[key].where}</small></span>
            <b>{pose[key]}°<small>{t.angles[key].range}</small></b>
            <i>
              <em style={{ left: `${spot.from}%`, width: `${spot.width}%` }}></em>
              <span style={{ left: `${spot.mark}%` }}></span>
            </i>
          </div>
        );
      })}
    </div>
  );
}
