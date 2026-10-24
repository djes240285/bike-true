import { useEffect, useRef, useState } from 'react';
import { dict, type Locale } from '../i18n';
import { bandFor, type AngleKey } from '../lib/advice';
import { readReading, writeReading } from '../lib/device';
import { clearFrames, loadFrame, saveFrame } from '../lib/frames';
import { pathFor } from '../lib/paths';
import { crowd, readFrame, toPixels, type AngleReading, type Frame, type Point } from '../lib/reading';
import { idealBottom, idealTop, jointsOf, moved } from '../lib/target';
import PoseStage, { type Scene } from './PoseStage';
const WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const MODEL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

type Status = 'empty' | 'ready' | 'busy' | 'done' | 'retake' | 'crowd';

type ExamplePose = Record<'wrist' | 'elbow' | 'shoulder' | 'hip' | 'knee' | 'ankle', [number, number]>;

/** Суставы на кадрах-примерах (доли кадра 1280×720), сняты той же моделью позы. */
const EXAMPLES: Record<'bottom' | 'top', { src: string; joints: ExamplePose }> = {
  bottom: {
    src: '/examples/crank-down.jpg',
    joints: {
      wrist: [0.3714, 0.4376],
      elbow: [0.43, 0.3102],
      shoulder: [0.4742, 0.1552],
      hip: [0.589, 0.3872],
      knee: [0.5372, 0.6282],
      ankle: [0.5472, 0.8694],
    },
  },
  top: {
    src: '/examples/crank-up.jpg',
    joints: {
      wrist: [0.391, 0.4386],
      elbow: [0.4469, 0.32],
      shoulder: [0.4939, 0.1738],
      hip: [0.6015, 0.379],
      knee: [0.4745, 0.4452],
      ankle: [0.5364, 0.6459],
    },
  },
};

const LABEL_AT: Record<AngleKey, keyof ExamplePose> = { knee: 'knee', back: 'hip', arm: 'elbow', hip: 'hip' };

const emptyReading: AngleReading = { knee: null, back: null, arm: null, hip: null };
const savedReading = readReading();

export default function Analyzer({ locale }: { locale: Locale }) {
  const t = dict[locale];
  const landmarker = useRef<PoseDetect | null>(null);
  const measureRef = useRef<(frame: Frame, file: Blob, persist: boolean) => Promise<void>>(async () => undefined);
  const [modelError, setModelError] = useState('');
  const [loading, setLoading] = useState(true);
  const [bottom, setBottom] = useState<Status>('empty');
  const [top, setTop] = useState<Status>('empty');
  const [bottomScene, setBottomScene] = useState<Scene | null>(null);
  const [topScene, setTopScene] = useState<Scene | null>(null);
  const [reading, setReading] = useState<AngleReading>(savedReading?.reading ?? emptyReading);
  const [hadTop, setHadTop] = useState(savedReading?.hadTop ?? false);

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
    writeReading(reading, hadTop);
  }, [reading, hadTop]);

  useEffect(() => {
    if (loading || !landmarker.current) return;
    let cancelled = false;
    void (async () => {
      try {
        const [bottomBlob, topBlob] = await Promise.all([loadFrame('bottom'), loadFrame('top')]);
        if (cancelled || !landmarker.current) return;
        if (bottomBlob) await measureRef.current('bottom', bottomBlob, false);
        if (!cancelled && topBlob) await measureRef.current('top', topBlob, false);
      } catch {
        /* angles already restored */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading]);

  async function measure(frame: Frame, file: Blob, persist: boolean) {
    if (!landmarker.current) return;
    const setStatus = frame === 'bottom' ? setBottom : setTop;
    const setScene = frame === 'bottom' ? setBottomScene : setTopScene;
    setStatus('busy');
    setScene((previous) => {
      previous?.image.close();
      return null;
    });
    let image: ImageBitmap;
    try {
      image = await createImageBitmap(file);
    } catch {
      setStatus('retake');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    canvas.getContext('2d')?.drawImage(image, 0, 0);
    const result = landmarker.current.detect(canvas);
    const poses = (result.landmarks ?? []) as Point[][];
    if (crowd(poses)) {
      image.close();
      setStatus('crowd');
      return;
    }
    const person = poses[0];
    if (!person) {
      image.close();
      setStatus('retake');
      return;
    }
    const pixels = toPixels(person, image.width, image.height);
    const next = readFrame(pixels, frame);
    const useful = frame === 'bottom' ? next.knee ?? next.back ?? next.arm : next.hip;
    const current = jointsOf(pixels);
    if (useful === null || !current) {
      image.close();
      setStatus('retake');
      return;
    }
    const ideal = frame === 'bottom' ? idealBottom(current) : idealTop(current);
    setScene({ image, current, ideal, changed: moved(current, ideal, image.width / 200) });
    setReading((value) => ({ ...value, ...stripNulls(next) }));
    if (frame === 'top') setHadTop(true);
    setStatus('done');
    if (!persist) return;
    try {
      await saveFrame(frame, file);
    } catch {
      /* quota or private mode */
    }
  }
  measureRef.current = measure;

  function reset() {
    setReading(emptyReading);
    setHadTop(false);
    setBottom('empty');
    setTop('empty');
    bottomScene?.image.close();
    topScene?.image.close();
    setBottomScene(null);
    setTopScene(null);
    writeReading(emptyReading, false);
    void clearFrames().catch(() => undefined);
  }

  const hasReading = Object.values(reading).some((value) => typeof value === 'number');

  if (modelError) {
    return (
      <div className="analyzer">
        <p className="warn">{modelError}</p>
        {hasReading ? (
          <>
            <p className="note">{t.analyze.kept}</p>
            <AngleList locale={locale} reading={reading} keys={['knee', 'back', 'arm', 'hip']} />
            <div className="actions">
              <a className="button" href={pathFor(locale, '/visit')}>{t.analyze.toVisit}</a>
            </div>
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div className="analyzer">
      {loading ? <p className="muted loading-line">{t.analyze.loading}</p> : null}
      <div className="shots">
        <FramePanel
          letter="A"
          title={t.analyze.bottom}
          hint={t.analyze.bottomHint}
          example="bottom"
          status={bottom}
          scene={bottomScene}
          name="bottom"
          locale={locale}
          reading={reading}
          keys={['knee', 'back', 'arm']}
          disabled={loading}
          onFile={(file) => file && measure('bottom', file, true)}
        />
        <FramePanel
          letter="B"
          title={t.analyze.top}
          hint={t.analyze.topOptional}
          example="top"
          status={top}
          scene={topScene}
          name="top"
          locale={locale}
          reading={reading}
          keys={['hip']}
          disabled={loading}
          onFile={(file) => file && measure('top', file, true)}
        />
      </div>
      <p className="note">{t.disclaimer}</p>
      <div className="actions">
        <a className="button" href={pathFor(locale, '/visit')}>{t.analyze.toVisit}</a>
        {bottomScene || topScene || hasReading ? (
          <button className="button ghost" type="button" onClick={reset}>{t.analyze.reset}</button>
        ) : null}
      </div>
    </div>
  );
}

function FramePanel({
  letter,
  title,
  hint,
  example,
  status,
  scene,
  name,
  locale,
  reading,
  keys,
  disabled,
  onFile,
}: {
  letter: string;
  title: string;
  hint: string;
  example: 'bottom' | 'top';
  status: Status;
  scene: Scene | null;
  name: string;
  locale: Locale;
  reading: AngleReading;
  keys: AngleKey[];
  disabled: boolean;
  onFile: (file: File | undefined) => void;
}) {
  const t = dict[locale];
  const copy = t.analyze;
  const [over, setOver] = useState(false);
  const picker = (
    <input
      type="file"
      accept="image/*"
      hidden
      disabled={disabled}
      onChange={(event) => {
        onFile(event.target.files?.[0]);
        event.target.value = '';
      }}
    />
  );

  return (
    <section className="shot">
      <header className="shot-head">
        <span className="shot-letter">{letter}</span>
        <div>
          <h2>{title}</h2>
          <p>{hint}</p>
        </div>
      </header>

      {scene ? (
        <>
          <PoseStage scene={scene} copy={copy} name={name} />
          <label className="button ghost shot-replace">
            {copy.replace}
            {picker}
          </label>
        </>
      ) : (
        <label
          className={`drop${over ? ' is-over' : ''}${disabled ? ' is-disabled' : ''}`}
          onDragOver={(event) => {
            event.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setOver(false);
            if (!disabled) onFile(event.dataTransfer.files?.[0]);
          }}
        >
          <ExampleFigure kind={example} keys={keys} locale={locale} />
          <span className="drop-bar">
            <span className="button">{status === 'busy' ? copy.measuring : copy.upload}</span>
            <small>{copy.dropHere}</small>
          </span>
          {picker}
        </label>
      )}

      {status === 'retake' ? <p className="warn">{copy.retake}</p> : null}
      {status === 'crowd' ? <p className="warn">{copy.crowd}</p> : null}

      {(() => {
        const saved = !scene && keys.some((key) => typeof reading[key] === 'number');
        if (!scene && !saved) {
          return (
            <div className="measures">
              <span>{copy.measures}</span>
              {keys.map((key) => (
                <b key={key}>
                  {t.angles[key].label} <i>{t.angles[key].range}</i>
                </b>
              ))}
            </div>
          );
        }
        return (
          <>
            {saved ? <p className="note">{copy.kept}</p> : null}
            <AngleList locale={locale} reading={reading} keys={keys} />
          </>
        );
      })()}
    </section>
  );
}

function ExampleFigure({ kind, keys, locale }: { kind: 'bottom' | 'top'; keys: AngleKey[]; locale: Locale }) {
  const t = dict[locale];
  const { src, joints } = EXAMPLES[kind];
  const at = (name: keyof ExamplePose) => ({ x: joints[name][0] * 1280, y: joints[name][1] * 720 });
  const chain = (['wrist', 'elbow', 'shoulder', 'hip', 'knee', 'ankle'] as const).map(at);
  return (
    <span className="example">
      <img src={src} alt="" />
      <svg viewBox="0 0 1280 720" aria-hidden="true">
        <polyline points={chain.map((point) => `${point.x},${point.y}`).join(' ')} />
        {chain.map((point, index) => (
          <circle key={index} cx={point.x} cy={point.y} r="9" />
        ))}
        {keys.map((key) => {
          const point = at(LABEL_AT[key]);
          const label = t.angles[key].label;
          const width = label.length * 17 + 36;
          const x = Math.min(1280 - width - 16, point.x + 22);
          return (
            <g key={key} className="example-label">
              <rect x={x} y={point.y - 24} width={width} height="48" rx="24" />
              <text x={x + 18} y={point.y + 9}>{label}</text>
            </g>
          );
        })}
      </svg>
      <span className="drop-tag">{t.analyze.example}</span>
    </span>
  );
}

function AngleList({ locale, reading, keys }: { locale: Locale; reading: AngleReading; keys: AngleKey[] }) {
  const t = dict[locale];
  return (
    <div className="angles">
      {keys.map((key) => {
        const value = reading[key];
        if (value === null) {
          return (
            <article key={key} className="readout muted-readout">
              <b>—</b>
              <span>
                <strong>{t.angles[key].label}</strong>
                {t.analyze.notVisible}
              </span>
            </article>
          );
        }
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

type PoseDetect = {
  detect: (image: HTMLCanvasElement) => { landmarks?: Point[][] };
  close: () => void;
};
