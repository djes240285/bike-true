import { useEffect, useRef, useState } from 'react';
import { dict, type Locale } from '../i18n';
import { band, CORRIDORS, type AngleKey } from '../lib/advice';
import type { SavedBike } from '../lib/bike-sync';
import { corridorFor, explainFactors, layerNotes, leadingNote, type BodyLayer, type Grade, type NoteCode } from '../lib/layers';
import Factors from './Factors';
import { crowd, LEFT, pickSide, readFrame, RIGHT, toPixels, type AngleReading, type Point } from '../lib/reading';
import { readStroke, sampleSpan, sampleTimes, strokeAngles, type StrokeReading, type StrokeSample } from '../lib/stroke';
import { frameAngles, poseAt, smoothPoses } from '../lib/track';

type Detect = (canvas: HTMLCanvasElement) => { landmarks?: Point[][] };

type FilmSample = StrokeSample & { points: Point[] | null };

const KEYS: AngleKey[] = ['knee', 'back', 'arm', 'hip'];

const NOTE_KEY: Record<NoteCode, keyof typeof dict.ru.analyze.notes> = {
  'knee-crank': 'kneeCrank',
  'arm-stem-long': 'armStemLong',
  'arm-stem-short': 'armStemShort',
  'back-posterior': 'backPosterior',
  'hip-flex': 'hipFlex',
  'knee-ankle': 'kneeAnkle',
  'arm-shoulder': 'armShoulder',
  'back-drop-flat': 'backDropFlat',
  'back-drop-up': 'backDropUp',
};

const QUESTIONS: (keyof BodyLayer)[] = ['posterior', 'hip', 'ankle', 'shoulder'];
const GRADES: Grade[] = ['easy', 'reach', 'effort', 'cant'];

function questionText(copy: typeof dict.ru.analyze, id: keyof BodyLayer): string {
  if (id === 'posterior') return copy.bodyPosterior;
  if (id === 'hip') return copy.bodyHip;
  if (id === 'ankle') return copy.bodyAnkle;
  return copy.bodyShoulder;
}

function gradeText(copy: typeof dict.ru.analyze, id: Grade): string {
  if (id === 'easy') return copy.gradeEasy;
  if (id === 'reach') return copy.gradeReach;
  if (id === 'effort') return copy.gradeEffort;
  return copy.gradeCant;
}

function seek(video: HTMLVideoElement, time: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (video.readyState >= 2 && Math.abs(video.currentTime - time) < 0.03) {
      resolve(true);
      return;
    }
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      video.removeEventListener('seeked', onReady);
      video.removeEventListener('loadeddata', onReady);
      window.clearTimeout(timer);
      resolve(ok);
    };
    const onReady = () => {
      if (video.readyState >= 2 && Math.abs(video.currentTime - time) < 0.12) finish(true);
    };
    video.addEventListener('seeked', onReady);
    video.addEventListener('loadeddata', onReady);
    const timer = window.setTimeout(() => finish(false), 2000);
    try {
      video.currentTime = time;
    } catch {
      finish(false);
    }
  });
}

function wedge(
  context: CanvasRenderingContext2D,
  joint: Point,
  from: Point,
  to: Point,
  radius: number,
) {
  const start = Math.atan2(from.y - joint.y, from.x - joint.x);
  let delta = Math.atan2(to.y - joint.y, to.x - joint.x) - start;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  context.beginPath();
  context.arc(joint.x, joint.y, radius, start, start + delta, delta < 0);
  context.stroke();
}

function drawnSample(samples: FilmSample[], time: number, width: number, height: number): FilmSample | null {
  const points = poseAt(samples, time);
  if (!points || width < 2 || height < 2) return null;
  return { t: time, ...frameAngles(points, width, height), points };
}

function draw(canvas: HTMLCanvasElement, sample: FilmSample | null) {
  const context = canvas.getContext('2d');
  if (!context) return;
  context.clearRect(0, 0, canvas.width, canvas.height);
  if (!sample?.points) return;
  const side = pickSide(sample.points);
  if (!side) return;
  const index = side === 'right' ? RIGHT : LEFT;
  const chain = [index.wrist, index.elbow, index.shoulder, index.hip, index.knee, index.ankle]
    .map((at) => sample.points?.[at])
    .filter((point): point is Point => Boolean(point && (point.visibility ?? 0) >= 0.5))
    .map((point) => ({ x: point.x * canvas.width, y: point.y * canvas.height }));
  if (chain.length < 2) return;
  const line = Math.max(3, canvas.width / 170);
  context.strokeStyle = '#fbbf24';
  context.lineWidth = line;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.beginPath();
  chain.forEach((point, at) => (at ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y)));
  context.stroke();
  for (const point of chain) {
    context.fillStyle = 'white';
    context.beginPath();
    context.arc(point.x, point.y, line * 1.5, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#d97706';
    context.beginPath();
    context.arc(point.x, point.y, line * 0.9, 0, Math.PI * 2);
    context.fill();
  }
  const at = (name: keyof typeof index) => {
    const point = sample.points?.[index[name]];
    if (!point || (point.visibility ?? 0) < 0.5) return null;
    return { x: point.x * canvas.width, y: point.y * canvas.height };
  };
  const hipPoint = at('hip');
  const kneePoint = at('knee');
  const anklePoint = at('ankle');
  const shoulderPoint = at('shoulder');
  context.strokeStyle = '#fde68a';
  context.lineWidth = Math.max(2, line * 0.75);
  if (hipPoint && kneePoint && anklePoint) wedge(context, kneePoint, hipPoint, anklePoint, line * 4.2);
  if (shoulderPoint && hipPoint && kneePoint) wedge(context, hipPoint, shoulderPoint, kneePoint, line * 3.4);

  const knee = sample.points[index.knee];
  if (sample.knee === null || !knee) return;
  const label = `${Math.round(sample.knee)}°`;
  const size = Math.max(16, canvas.width / 36);
  context.font = `600 ${size}px "Inter Variable", system-ui, sans-serif`;
  const pad = size * 0.55;
  const boxWidth = context.measureText(label).width + pad * 2;
  const boxHeight = size * 1.7;
  const x = Math.min(canvas.width - boxWidth - 8, knee.x * canvas.width + line * 3);
  const y = Math.max(8, knee.y * canvas.height - boxHeight - line * 2);
  context.fillStyle = 'rgba(28, 25, 23, 0.85)';
  context.beginPath();
  context.roundRect(x, y, boxWidth, boxHeight, boxHeight / 2);
  context.fill();
  context.fillStyle = '#fde68a';
  context.fillText(label, x + pad, y + size * 1.15);
}

export default function RideFilm({
  locale,
  ready,
  detect,
  onReading,
  onLayer,
  bike,
  generation = 0,
}: {
  locale: Locale;
  ready: boolean;
  detect: Detect | null;
  onReading: (reading: AngleReading, hadTop: boolean) => void;
  onLayer?: (body: BodyLayer) => void;
  bike: SavedBike | null;
  generation?: number;
}) {
  const copy = dict[locale].analyze;
  const angles = dict[locale].angles;
  const advice = dict[locale].advice;
  const videoRef = useRef<HTMLVideoElement>(null);
  const workRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const urlRef = useRef<string | null>(null);
  const [over, setOver] = useState(false);
  const [status, setStatus] = useState<'empty' | 'busy' | 'done' | 'retake' | 'crowd'>('empty');
  const [progress, setProgress] = useState(0);
  const [span, setSpan] = useState<'full' | 'minute' | 'capped'>('full');
  const [url, setUrl] = useState<string | null>(null);
  const [samples, setSamples] = useState<FilmSample[]>([]);
  const [stroke, setStroke] = useState<StrokeReading | null>(null);
  const [reveal, setReveal] = useState(0);
  const [body, setBody] = useState<BodyLayer>({});

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !url) return;
    let frame = 0;
    const tick = () => {
      const canvas = canvasRef.current;
      if (canvas && video.videoWidth) {
        if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
        if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;
        draw(canvas, drawnSample(samples, video.currentTime, video.videoWidth, video.videoHeight));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [url, samples]);

  useEffect(() => {
    if (!stroke) return;
    setReveal(1);
    const id = window.setInterval(() => {
      setReveal((value) => (value >= KEYS.length ? value : value + 1));
    }, 450);
    return () => window.clearInterval(id);
  }, [stroke]);

  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  useEffect(() => {
    if (!generation) return;
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setUrl(null);
    setSamples([]);
    setStroke(null);
    setStatus('empty');
    setProgress(0);
    setReveal(0);
    setSpan('full');
    setBody({});
    setOver(false);
  }, [generation]);

  async function take(file: File | undefined) {
    const video = workRef.current;
    if (!file || !detect || !video) return;
    setStatus('busy');
    setProgress(0);
    setStroke(null);
    setReveal(0);
    setSamples([]);
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const nextUrl = URL.createObjectURL(file);
    urlRef.current = nextUrl;
    setUrl(null);
    video.src = nextUrl;
    try {
      await new Promise<void>((resolve, reject) => {
        if (video.readyState >= 1 && Number.isFinite(video.duration)) resolve();
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error('video'));
      });
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      const times = sampleTimes(duration);
      if (times.length === 0) throw new Error('short');
      setSpan(sampleSpan(duration));
      const width = 640;
      const height = Math.max(1, Math.round((width * video.videoHeight) / video.videoWidth));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('canvas');
      const found: FilmSample[] = [];
      let crowded = 0;
      let seenFrames = 0;
      for (let index = 0; index < times.length; index += 1) {
        const time = times[index] ?? 0;
        const readyFrame = await seek(video, time);
        const empty = () => found.push({ t: time, knee: null, hip: null, back: null, arm: null, points: null });
        if (!readyFrame || video.readyState < 2) empty();
        else {
          try {
            context.drawImage(video, 0, 0, width, height);
          } catch {
            empty();
            setProgress((index + 1) / times.length);
            continue;
          }
          const poses = (detect(canvas).landmarks ?? []) as Point[][];
          seenFrames += 1;
          if (crowd(poses) || !poses[0]) {
            if (crowd(poses)) crowded += 1;
            empty();
          } else {
            const person = poses[0];
            const pixels = toPixels(person, width, height);
            const down = readFrame(pixels, 'bottom');
            const up = readFrame(pixels, 'top');
            found.push({ t: time, knee: down.knee, back: down.back, arm: down.arm, hip: up.hip, points: person });
          }
        }
        setProgress((index + 1) / times.length);
      }
      if (seenFrames > 0 && crowded > seenFrames / 2) {
        setStatus('crowd');
        return;
      }
      const next = readStroke(found);
      if (next.knee === null && next.hip === null && next.back === null) {
        setStatus('retake');
        return;
      }
      const drawFrames = smoothPoses(found).map((frame, index) => ({
        ...(found[index] as FilmSample),
        points: frame.points,
      }));
      setSamples(drawFrames);
      setStroke(next);
      setUrl(nextUrl);
      setStatus('done');
      const reading = strokeAngles(next);
      onReading(reading, reading.hip !== null);
    } catch {
      setStatus('retake');
    }
  }

  const bits = bike
    ? { crankMm: bike.crank_mm, stemMm: bike.stem_mm, saddleMm: bike.saddle_mm, dropMm: bike.drop_mm }
    : null;
  const reading = stroke ? strokeAngles(stroke) : null;
  const notes = reading ? layerNotes(reading, bits, body) : [];

  useEffect(() => {
    onLayer?.(body);
  }, [body, onLayer]);
  const shown = KEYS.slice(0, reveal);
  const drifting = stroke !== null && ((stroke.kneeSpread ?? 0) > 4 || (stroke.hipSpread ?? 0) > 4);

  return (
    <section className="shot ride">
      <video ref={workRef} className="film-work" muted playsInline preload="auto" />
      <header className="shot-head">
        <span className="shot-letter">▶</span>
        <div>
          <h2>{copy.videoTitle}</h2>
          <p>{copy.videoHint}</p>
        </div>
      </header>

      {url && status === 'done' ? (
        <div className="film-stage">
          <video ref={videoRef} src={url} controls playsInline />
          <canvas ref={canvasRef} aria-hidden="true" />
        </div>
      ) : (
        <label
          className={`drop${over ? ' is-over' : ''}${ready ? '' : ' is-disabled'}`}
          onDragOver={(event) => {
            event.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setOver(false);
            if (ready && status !== 'busy') void take(event.dataTransfer.files?.[0]);
          }}
        >
          <span className="drop-bar film-bar">
            <span className="button">{status === 'busy' ? copy.measuring : copy.videoUpload}</span>
            <small>{copy.videoDrop}</small>
          </span>
          <input
            type="file"
            accept="video/*"
            hidden
            disabled={!ready || status === 'busy'}
            onChange={(event) => {
              void take(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
        </label>
      )}

      {url && status === 'done' ? (
        <label className="button ghost shot-replace">
          {copy.videoReplace}
          <input
            type="file"
            accept="video/*"
            hidden
            onChange={(event) => {
              void take(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
        </label>
      ) : null}

      {status === 'busy' ? (
        <p className="note" role="status">{copy.videoWorking} {Math.round(progress * 100)}%</p>
      ) : null}
      {status === 'retake' ? <p className="warn">{copy.retake}</p> : null}
      {status === 'crowd' ? <p className="warn">{copy.crowd}</p> : null}
      {span === 'minute' && status === 'done' ? <p className="note">{copy.videoMinute}</p> : null}
      {span === 'capped' && status === 'done' ? <p className="note">{copy.videoLong}</p> : null}
      {reading ? (
        <p className="note">{bike ? copy.fitBikeOn.replace('{name}', bike.name) : copy.fitBikeOff}</p>
      ) : null}
      {reading ? <Factors locale={locale} scope="bike" rows={explainFactors(reading, bits, body)} /> : null}

      {reading && shown.length > 0 ? (
        <div className="angles">
          {shown.map((key) => {
            const value = reading[key];
            if (value === null) {
              return (
                <article key={key} className="readout muted-readout">
                  <b>—</b>
                  <span><strong>{angles[key].label}</strong>{copy.notVisible}</span>
                </article>
              );
            }
            const corridor = corridorFor(key, body);
            const zone = band(value, corridor.min, corridor.max);
            const lead = reading ? leadingNote(key, reading, bits, body) : null;
            const sentence = lead
              ? copy.notes[NOTE_KEY[lead]].replace('{mm}', String((lead.startsWith('arm') ? bike?.stem_mm : lead.startsWith('back-drop') ? bike?.drop_mm : bike?.crank_mm) ?? '—'))
              : advice[key][zone];
            return (
              <article key={key} className={`readout ${zone}`}>
                <b>{value.toFixed(0)}°</b>
                <span>
                  <strong>{angles[key].label}</strong>
                  {sentence}
                  <i>{corridor.min}–{corridor.max}°</i>
                </span>
              </article>
            );
          })}
        </div>
      ) : null}

      {reveal >= KEYS.length && drifting ? <p className="warn">{copy.videoFloat}</p> : null}

      {reveal >= KEYS.length && reading ? (
        <>
          <div className="body-layer">
            <h3>{copy.bodyTitle}</h3>
            <p>{copy.bodyHint}</p>
            {QUESTIONS.map((question) => {
              const picked = body[question];
              const angleKey: AngleKey = question === 'posterior' ? 'back' : question === 'ankle' ? 'knee' : question === 'shoulder' ? 'arm' : 'hip';
              const base = CORRIDORS[angleKey];
              const next = corridorFor(angleKey, picked ? { [question]: picked } : null);
              const moved = next.min !== base.min || next.max !== base.max;
              return (
                <div key={question} className="grade-row">
                  <span>
                    {questionText(copy, question)}
                    {picked ? (
                      <small>
                        {moved
                          ? copy.factorShifts
                            .replace('{label}', questionText(copy, question))
                            .replace('{grade}', gradeText(copy, picked))
                            .replace('{angle}', angles[angleKey].label)
                            .replace('{min}', String(next.min))
                            .replace('{max}', String(next.max))
                            .replace('{baseMin}', String(base.min))
                            .replace('{baseMax}', String(base.max))
                          : copy.factorHold
                            .replace('{label}', questionText(copy, question))
                            .replace('{grade}', gradeText(copy, picked))
                            .replace('{angle}', angles[angleKey].label)
                            .replace('{min}', String(next.min))
                            .replace('{max}', String(next.max))}
                      </small>
                    ) : (
                      <small>
                        {copy.factorBodyMissing
                          .replace('{label}', questionText(copy, question))
                          .replace('{angle}', angles[angleKey].label)
                          .replace('{min}', String(base.min))
                          .replace('{max}', String(base.max))}
                      </small>
                    )}
                  </span>
                  <span className="grades">
                    {GRADES.map((grade) => (
                      <button
                        key={grade}
                        type="button"
                        className={`button ghost${picked === grade ? ' is-on' : ''}`}
                        aria-pressed={picked === grade}
                        onClick={() => setBody((current) => ({
                          ...current,
                          [question]: current[question] === grade ? undefined : grade,
                        }))}
                      >
                        {gradeText(copy, grade)}
                      </button>
                    ))}
                  </span>
                </div>
              );
            })}
          </div>

          {notes.length > 0 ? (
            <ul className="film-notes">
              {notes.filter((code) => !KEYS.some((key) => reading && leadingNote(key, reading, bits, body) === code)).map((code) => (
                <li key={code}>{copy.notes[NOTE_KEY[code]].replace('{mm}', String((code.startsWith('arm') ? bike?.stem_mm : code.startsWith('back-drop') ? bike?.drop_mm : bike?.crank_mm) ?? '—'))}</li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
