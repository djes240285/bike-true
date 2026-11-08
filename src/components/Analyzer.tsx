import { useCallback, useEffect, useRef, useState } from 'react';
import { dict, type Locale } from '../i18n';
import { band, type AngleKey } from '../lib/advice';
import { readReading, readSitter, writeReading, writeSitter, type SitterDraft } from '../lib/device';
import { clearFrames, loadFrame, saveFrame } from '../lib/frames';
import type { PersonOverhead } from '../lib/account';
import type { SavedBike } from '../lib/bike-sync';
import { corridorFor, keptReading, saddleHeld, type BodyLayer } from '../lib/layers';
import { pathFor } from '../lib/paths';
import { crowd, footStance, readFrame, toPixels, type AngleReading, type Frame, type Point } from '../lib/reading';
import { crankScale, shiftMm, type AnkleStance } from '../lib/foot';
import type { FitId } from '../lib/fits';
import { idealBottom, idealTop, jointsOf, moved, wishJoints, type BackWish } from '../lib/target';
import PoseStage, { type Scene } from './PoseStage';
import RideFilm from './RideFilm';
import Overhead from './Overhead';
import Picture from './Picture';
import SaveReading from './SaveReading';
import Sitter from './Sitter';
import TextHint from './TextHint';
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

function poseBands(body: BodyLayer, fit: FitId | null) {
  return {
    knee: corridorFor('knee', body, fit),
    back: corridorFor('back', body, fit),
    arm: corridorFor('arm', body, fit),
    hip: corridorFor('hip', body, fit),
  };
}
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
  const [film, setFilm] = useState<AngleReading | null>(null);
  const [source, setSource] = useState<'film' | 'photos' | null>(
    savedReading && Object.values(savedReading.reading).some((value) => typeof value === 'number') ? 'photos' : null,
  );
  const [sitter, setSitter] = useState<SitterDraft>(readSitter);
  const layerBody = sitter.who === 'other' ? sitter.other.body : sitter.me.body;
  const [layerBike, setLayerBike] = useState<SavedBike | null>(null);
  const [personOverhead, setPersonOverhead] = useState<PersonOverhead | null>(null);
  const [fitChoice, setFitChoice] = useState<FitId | null>(null);
  const [hands, setHands] = useState<'hoods' | 'drops' | 'tops' | 'grips' | null>(null);
  const [backWish, setBackWish] = useState<BackWish | null>(null);
  const [pains, setPains] = useState({ foot: false, hands: false, saddle: false, leg: false });
  const [spread, setSpread] = useState<{ knee: number | null; hip: number | null } | null>(null);
  const [photoAnkle, setPhotoAnkle] = useState<AnkleStance | null>(null);
  const [filmAnkle, setFilmAnkle] = useState<AnkleStance | null>(null);
  const [marks, setMarks] = useState<Point[]>([]);
  const [epoch, setEpoch] = useState(0);
  const [hadTop, setHadTop] = useState(savedReading?.hadTop ?? false);
  const onBike = useCallback((bike: SavedBike | null) => setLayerBike(bike), []);
  const onPerson = useCallback((card: PersonOverhead | null) => setPersonOverhead(card), []);
  const fitTouched = useRef(false);
  const pass = useRef(0);
  useEffect(() => {
    writeSitter(sitter);
  }, [sitter]);

  useEffect(() => {
    if (fitTouched.current || !layerBike) return;
    setFitChoice(layerBike.fit);
  }, [layerBike]);

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
    const mine = pass.current;
    void (async () => {
      try {
        const [bottomBlob, topBlob] = await Promise.all([loadFrame('bottom'), loadFrame('top')]);
        if (cancelled || mine !== pass.current || !landmarker.current) return;
        if (bottomBlob) await measureRef.current('bottom', bottomBlob, false);
        if (!cancelled && mine === pass.current && topBlob) await measureRef.current('top', topBlob, false);
      } catch {
        /* angles already restored */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading]);

  async function measure(frame: Frame, file: Blob, persist: boolean) {
    const mine = pass.current;
    if (!landmarker.current) return;
    const setStatus = frame === 'bottom' ? setBottom : setTop;
    const setScene = frame === 'bottom' ? setBottomScene : setTopScene;
    const live = () => mine === pass.current;
    setStatus('busy');
    setScene((previous) => {
      previous?.image.close();
      return null;
    });
    let image: ImageBitmap;
    try {
      image = await createImageBitmap(file);
    } catch {
      if (live()) setStatus('retake');
      return;
    }
    if (!live()) {
      image.close();
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    canvas.getContext('2d')?.drawImage(image, 0, 0);
    let result: { landmarks?: Point[][] };
    try {
      result = landmarker.current.detect(canvas);
    } catch {
      image.close();
      if (live()) setStatus('retake');
      return;
    }
    if (!live()) {
      image.close();
      return;
    }
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
    if (!live()) {
      image.close();
      return;
    }
    const bands = poseBands(layerBody, fitChoice);
    const ideal = frame === 'bottom' ? idealBottom(current, bands) : idealTop(current, bands);
    const wish = frame === 'bottom' && backWish ? wishJoints(current, backWish, corridorFor('back', layerBody, fitChoice)) : null;
    setScene({ image, current, ideal, changed: moved(current, ideal, image.width / 200), wish });
    setReading((value) => ({ ...value, ...stripNulls(next) }));
    if (frame === 'bottom') setPhotoAnkle(footStance(pixels));
    if (frame === 'top') setHadTop(true);
    setStatus('done');
    if (!persist || !live()) return;
    try {
      await saveFrame(frame, file);
    } catch {
      /* quota or private mode */
    }
  }
  measureRef.current = measure;

  useEffect(() => {
    const bands = poseBands(layerBody, fitChoice);
    setBottomScene((scene) => {
      if (!scene) return scene;
      const ideal = idealBottom(scene.current, bands);
      const wish = backWish ? wishJoints(scene.current, backWish, corridorFor('back', layerBody, fitChoice)) : null;
      return { ...scene, ideal, wish, changed: moved(scene.current, ideal, scene.image.width / 200) };
    });
    setTopScene((scene) => {
      if (!scene) return scene;
      const ideal = idealTop(scene.current, bands);
      return { ...scene, ideal, changed: moved(scene.current, ideal, scene.image.width / 200) };
    });
  }, [layerBody, fitChoice, backWish]);

  function reset() {
    pass.current += 1;
    setReading(emptyReading);
    setFilm(null);
    setSpread(null);
    setPhotoAnkle(null);
    setFilmAnkle(null);
    setMarks([]);
    setBackWish(null);
    setPersonOverhead(null);
    setHadTop(false);
    setBottom('empty');
    setTop('empty');
    bottomScene?.image.close();
    topScene?.image.close();
    setBottomScene(null);
    setTopScene(null);
    writeReading(emptyReading, false);
    void clearFrames().catch(() => undefined);
    setEpoch((value) => value + 1);
  }

  const filmOn = source === 'film';
  const photosOn = source === 'photos';
  const filmReading = filmOn && film && Object.values(film).some((value) => typeof value === 'number') ? film : null;
  const photoReading = photosOn ? reading : emptyReading;
  const saved = keptReading(photoReading, filmReading, filmOn ? spread : null);
  const ankle = filmOn ? filmAnkle : photosOn ? photoAnkle : null;
  const holdKnee = saddleHeld({
    shin: personOverhead?.flags.includes('shin-uneven') ?? false,
    toe: ankle === 'toe',
    foot: pains.foot,
    hands: pains.hands,
    saddle: pains.saddle,
    leg: pains.leg,
  });
  const crankMm = layerBike?.crank_mm ?? null;
  const scale = marks.length === 2 && crankMm ? crankScale(marks[0], marks[1], crankMm) : null;
  const saddleStep = scale && bottomScene ? shiftMm(bottomScene.current.hip, bottomScene.ideal.hip, scale) : null;
  const hasReading = Object.values(saved).some((value) => typeof value === 'number');
  const bodyOn = Boolean(layerBody.posterior || layerBody.hip || layerBody.ankle || layerBody.shoulder);
  const canSave = hasReading || bodyOn || personOverhead !== null;

  if (modelError) {
    return (
      <div className="analyzer">
        <SaveReading
          locale={locale}
          reading={saved}
          hadTop={hadTop || saved.hip !== null}
          onBike={onBike}
          fit={fitChoice}
          canSave={hasReading}
        />
        <p className="warn">{modelError}</p>
        {hasReading ? (
          <>
            <p className="note">{t.analyze.kept}</p>
            <AngleList
              locale={locale}
              reading={reading}
              keys={['knee', 'back', 'arm', 'hip']}
              fit={fitChoice}
              hands={hands}
              holdKnee={holdKnee}
              body={layerBody}
            />
            <div className="analyzer-foot">
              <div className="actions">
                <a className="button" href={pathFor(locale, '/visit')}>{t.analyze.toVisit}</a>
                <button className="button ghost" type="button" onClick={reset}>{t.analyze.reset}</button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div className="analyzer">
      <SaveReading
        locale={locale}
        reading={saved}
        hadTop={hadTop || saved.hip !== null}
        onBike={onBike}
        body={layerBody}
        overhead={personOverhead}
        fit={fitChoice}
        canSave={canSave}
        sitter={sitter}
      />
      {loading ? <p className="muted loading-line">{t.analyze.loading}</p> : null}
      <section className="ask">
        <p className="ask-line">
          {t.analyze.askFit}
          <TextHint label={t.analyze.askFit} title={t.analyze.askFit} text={t.analyze.askFitHint} />
        </p>
        <div className="ask-row">
          {(['city', 'endurance', 'gravel', 'race', 'mtb'] as FitId[]).map((id) => (
            <button key={id} className={`button ghost${fitChoice === id ? ' is-on' : ''}`} type="button" aria-pressed={fitChoice === id} onClick={() => { fitTouched.current = true; setFitChoice(id); }}>
              {t.account[id]}
            </button>
          ))}
        </div>
        {fitChoice ? <p className="note">{t.analyze.fitNotes[fitChoice]}</p> : null}
        <p>{t.analyze.askHands}</p>
        <div className="ask-row">
          {([
            ['hoods', t.analyze.handsHoods],
            ['drops', t.analyze.handsDrops],
            ['tops', t.analyze.handsTops],
            ['grips', t.analyze.handsGrips],
          ] as const).map(([id, label]) => (
            <button key={id} className={`button ghost${hands === id ? ' is-on' : ''}`} type="button" aria-pressed={hands === id} onClick={() => setHands(id)}>
              {label}
            </button>
          ))}
        </div>
        <p className="ask-line">
          {t.analyze.askPain}
          <TextHint label={t.analyze.askPain} title={t.analyze.askPain} text={t.analyze.askPainHint} />
        </p>
        <div className="ask-row">
          {([
            ['foot', t.analyze.painFoot],
            ['hands', t.analyze.painHands],
            ['saddle', t.analyze.painSaddle],
            ['leg', t.analyze.painLeg],
          ] as const).map(([id, label]) => (
            <button key={id} className={`button ghost${pains[id] ? ' is-on' : ''}`} type="button" aria-pressed={pains[id]} onClick={() => setPains((current) => ({ ...current, [id]: !current[id] }))}>
              {label}
            </button>
          ))}
        </div>
      </section>
      <Sitter locale={locale} draft={sitter} reading={filmReading ?? photoReading} fit={fitChoice} onChange={setSitter} />
      <p className="fit-lead" role="status">
        {source === 'film' ? t.analyze.sourceFilm : source === 'photos' ? t.analyze.sourcePhotos : t.analyze.sourceNone}
      </p>
      <div className="ask-row source-pick" role="group" aria-label={t.analyze.sourceNone}>
        <button className={`button ghost${source === 'film' ? ' is-on' : ''}`} type="button" aria-pressed={source === 'film'} onClick={() => setSource('film')}>
          {t.analyze.videoTitle}
        </button>
        <button className={`button ghost${source === 'photos' ? ' is-on' : ''}`} type="button" aria-pressed={source === 'photos'} onClick={() => setSource('photos')}>
          {t.analyze.photos}
        </button>
      </div>
      <div hidden={source !== 'film'}>
        <RideFilm
          locale={locale}
          ready={!loading}
          detect={landmarker.current ? (canvas) => landmarker.current!.detect(canvas) : null}
          onReading={(next, top, extra) => {
            setFilm(next);
            setSpread({ knee: extra.kneeSpread, hip: extra.hipSpread });
            setFilmAnkle(extra.ankle);
            if (top) setHadTop(true);
          }}
          body={layerBody}
          bike={layerBike}
          fit={fitChoice}
          generation={epoch}
        />
      </div>
      <div className="shots" hidden={source !== 'photos'}>
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
            marks={marks}
            onMark={(point) => setMarks((current) => (current.length >= 2 ? [point] : [...current, point]))}
            fit={fitChoice}
            body={layerBody}
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
            fit={fitChoice}
            body={layerBody}
        />
      </div>
      <Picture
        locale={locale}
        photo={photoReading}
        film={filmReading}
        body={layerBody}
        bike={source ? layerBike : null}
        fit={fitChoice}
        hands={hands}
        holdKnee={holdKnee}
        ankle={ankle}
        saddleStep={photosOn ? saddleStep : null}
        ruler={photosOn}
        spread={spread}
        who={sitter.who === 'other' ? [sitter.other.name.trim(), sitter.other.height ? `${sitter.other.height} ${locale === 'en' ? 'cm' : 'см'}` : ''].filter(Boolean).join(', ') : ''}
        wish={backWish}
        onWish={setBackWish}
        marks={marks.length}
      />
      <Overhead
        locale={locale}
        ready={!loading}
        detect={landmarker.current ? (canvas) => landmarker.current!.detect(canvas) : null}
        seatKnee={saved.knee}
        generation={epoch}
        onPerson={onPerson}
      />
      <div className="analyzer-foot">
        <p className="note">{t.disclaimer}</p>
        <div className="actions">
          <a className="button" href={pathFor(locale, '/visit')}>{t.analyze.toVisit}</a>
          <button className="button ghost" type="button" onClick={reset}>{t.analyze.reset}</button>
        </div>
        {canSave ? <TextHint label={t.analyze.saveWhere} title={t.analyze.saveWhere} text={t.analyze.saveScope} /> : null}
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
  marks,
  onMark,
  fit,
  body,
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
  marks?: Point[];
  onMark?: (point: Point) => void;
  fit: FitId | null;
  body: BodyLayer;
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
          <PoseStage scene={scene} copy={copy} name={name} marks={marks} onMark={onMark} />
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
            <AngleList locale={locale} reading={reading} keys={keys} fit={fit} body={body} />
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

function AngleList({
  locale,
  reading,
  keys,
  fit,
  body,
}: {
  locale: Locale;
  reading: AngleReading;
  keys: AngleKey[];
  fit: FitId | null;
  body: BodyLayer;
}) {
  const t = dict[locale];
  const copy = t.analyze;
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
                {copy.notVisible}
              </span>
            </article>
          );
        }
        const corridor = corridorFor(key, body, fit);
        const zone = band(value, corridor.min, corridor.max);
        return (
          <article key={key} className={`readout ${zone}`}>
            <b>{value.toFixed(0)}°</b>
            <span>
              <strong>{t.angles[key].label}</strong>
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
