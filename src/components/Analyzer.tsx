import { useEffect, useRef, useState, type RefObject } from 'react';
import { dict, type Locale } from '../i18n';
import { bandFor, type AngleKey } from '../lib/advice';
import { pathFor } from '../lib/paths';
import { crowd, readFrame, toPixels, type AngleReading, type Frame, type Point } from '../lib/reading';

const STORAGE_KEY = 'biketrue.reading';
const WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const MODEL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

type Status = 'empty' | 'ready' | 'busy' | 'done' | 'retake' | 'crowd';

const emptyReading: AngleReading = { knee: null, back: null, arm: null, hip: null };

export default function Analyzer({ locale }: { locale: Locale }) {
  const t = dict[locale];
  const bottomRef = useRef<HTMLCanvasElement>(null);
  const topRef = useRef<HTMLCanvasElement>(null);
  const landmarker = useRef<PoseDetect | null>(null);
  const [modelError, setModelError] = useState('');
  const [loading, setLoading] = useState(true);
  const [bottom, setBottom] = useState<Status>('empty');
  const [top, setTop] = useState<Status>('empty');
  const [reading, setReading] = useState<AngleReading>(emptyReading);
  const [hadTop, setHadTop] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const vision = await import('@mediapipe/tasks-vision');
        const files = await vision.FilesetResolver.forVisionTasks(WASM);
        const created = await vision.PoseLandmarker.createFromOptions(files, {
          baseOptions: { modelAssetPath: MODEL },
          runningMode: 'IMAGE',
          numPoses: 2,
        });
        if (cancelled) {
          created.close();
          return;
        }
        landmarker.current = created;
        setLoading(false);
      } catch {
        if (!cancelled) {
          setLoading(false);
          setModelError(t.analyze.browser);
        }
      }
    })();
    return () => {
      cancelled = true;
      landmarker.current?.close();
    };
  }, [t.analyze.browser]);

  useEffect(() => {
    const hasNumber = Object.values(reading).some((value) => typeof value === 'number');
    if (!hasNumber) {
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...reading, hadTopPhoto: hadTop }));
  }, [reading, hadTop]);

  async function onFile(frame: Frame, file: File | undefined) {
    if (!file || !landmarker.current) return;
    const canvas = frame === 'bottom' ? bottomRef.current : topRef.current;
    const setStatus = frame === 'bottom' ? setBottom : setTop;
    if (!canvas) return;
    setStatus('busy');
    const bitmap = await createImageBitmap(file);
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.drawImage(bitmap, 0, 0);
    bitmap.close();
    const result = landmarker.current.detect(canvas);
    const poses = (result.landmarks ?? []) as Point[][];
    if (crowd(poses)) {
      setStatus('crowd');
      return;
    }
    const person = poses[0];
    if (!person) {
      setStatus('retake');
      return;
    }
    const next = readFrame(toPixels(person, canvas.width, canvas.height), frame);
    const useful = frame === 'bottom' ? next.knee ?? next.back ?? next.arm : next.hip;
    if (useful === null) {
      setStatus('retake');
      return;
    }
    drawSkeleton(context, person, canvas.width, canvas.height);
    setReading((current) => ({ ...current, ...stripNulls(next) }));
    if (frame === 'top') setHadTop(true);
    setStatus('done');
  }

  function reset() {
    setReading(emptyReading);
    setHadTop(false);
    setBottom('empty');
    setTop('empty');
    for (const canvas of [bottomRef.current, topRef.current]) {
      if (!canvas) continue;
      canvas.width = 0;
      canvas.height = 0;
    }
    sessionStorage.removeItem(STORAGE_KEY);
  }

  if (modelError) return <p className="warn">{modelError}</p>;

  return (
    <div>
      {loading ? <p className="muted">{t.analyze.loading}</p> : null}
      <FramePanel
        title={t.analyze.bottom}
        hint=""
        status={bottom}
        copy={t.analyze}
        canvasRef={bottomRef}
        disabled={loading || Boolean(modelError)}
        onFile={(file) => onFile('bottom', file)}
      />
      <AngleList locale={locale} reading={reading} keys={['knee', 'back', 'arm']} hipMissing={false} />
      <FramePanel
        title={t.analyze.top}
        hint={t.analyze.topOptional}
        status={top}
        copy={t.analyze}
        canvasRef={topRef}
        disabled={loading || Boolean(modelError)}
        onFile={(file) => onFile('top', file)}
      />
      <AngleList locale={locale} reading={reading} keys={['hip']} hipMissing={!hadTop} />
      <p className="note">{t.disclaimer}</p>
      <div className="actions">
        <a className="button" href={pathFor(locale, '/visit')}>{t.analyze.toVisit}</a>
        <button className="button ghost" type="button" onClick={reset}>{t.analyze.reset}</button>
      </div>
    </div>
  );
}

function FramePanel({
  title,
  hint,
  status,
  copy,
  canvasRef,
  disabled,
  onFile,
}: {
  title: string;
  hint: string;
  status: Status;
  copy: (typeof dict)['ru']['analyze'];
  canvasRef: RefObject<HTMLCanvasElement | null>;
  disabled: boolean;
  onFile: (file: File | undefined) => void;
}) {
  return (
    <section className="frame">
      <h2>{title}</h2>
      {hint ? <p className="muted">{hint}</p> : null}
      <label className="button ghost">
        {copy.pick}
        <input
          type="file"
          accept="image/*"
          hidden
          disabled={disabled}
          onChange={(event) => onFile(event.target.files?.[0])}
        />
      </label>
      <div className="stage">
        <canvas ref={canvasRef} />
      </div>
      {status === 'busy' ? <p>{copy.measuring}</p> : null}
      {status === 'retake' ? <p className="warn">{copy.retake}</p> : null}
      {status === 'crowd' ? <p className="warn">{copy.crowd}</p> : null}
    </section>
  );
}

function AngleList({
  locale,
  reading,
  keys,
  hipMissing,
}: {
  locale: Locale;
  reading: AngleReading;
  keys: AngleKey[];
  hipMissing: boolean;
}) {
  const t = dict[locale];
  return (
    <div className="angles">
      {keys.map((key) => {
        const value = reading[key];
        if (key === 'hip' && hipMissing && value === null) {
          return <p key={key}>{t.angles.hip.label}: {t.analyze.hipMissing}</p>;
        }
        if (value === null) return <p key={key} className="muted">{t.angles[key].label}: {t.analyze.noJoints}</p>;
        const zone = bandFor(key, value);
        return (
          <article key={key} className={`readout ${zone}`}>
            <b>{value.toFixed(0)}°</b>
            <span>
              <strong>{t.angles[key].label}</strong>
              {t.advice[key][zone]}
            </span>
          </article>
        );
      })}
    </div>
  );
}

function stripNulls(next: AngleReading): Partial<AngleReading> {
  return Object.fromEntries(Object.entries(next).filter(([, value]) => value !== null));
}

function drawSkeleton(context: CanvasRenderingContext2D, person: Point[], width: number, height: number) {
  const point = (index: number) => {
    const joint = person[index];
    if (!joint || (joint.visibility ?? 0) < 0.5) return null;
    return { x: joint.x * width, y: joint.y * height };
  };
  context.strokeStyle = '#9a3412';
  context.lineWidth = Math.max(3, width / 180);
  context.beginPath();
  for (const [from, to] of [
    [12, 14], [14, 16], [12, 24], [24, 26], [26, 28],
    [11, 13], [13, 15], [11, 23], [23, 25], [25, 27],
  ] as const) {
    const a = point(from);
    const b = point(to);
    if (!a || !b) continue;
    context.moveTo(a.x, a.y);
    context.lineTo(b.x, b.y);
  }
  context.stroke();
}

type PoseDetect = {
  detect: (image: HTMLCanvasElement) => { landmarks?: Point[][] };
  close: () => void;
};
