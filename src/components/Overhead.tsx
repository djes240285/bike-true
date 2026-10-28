import { useEffect, useRef, useState } from 'react';
import { dict, type Locale } from '../i18n';
import type { PersonOverhead } from '../lib/account';
import { LEFT, RIGHT, crowd, pickSide, toPixels, type Point } from '../lib/reading';
import { chainAngles, deepestIndex, kneeTrack, overheadFlags, torsoAgainstShin, type ChainAngles, type KneeTrack, type OverheadFlag, type TorsoCue } from '../lib/overhead';
import { sampleSpan, sampleTimes } from '../lib/stroke';
import { poseAt, smoothPoses, type PoseFrame } from '../lib/track';
import TextHint from './TextHint';

type Detect = (canvas: HTMLCanvasElement) => { landmarks?: Point[][] };
type View = 'front' | 'side';

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

function hipY(person: Point[]): number | null {
  const hips = [person[LEFT.hip], person[RIGHT.hip]].filter((point) => point && (point.visibility ?? 0) >= 0.5);
  if (hips.length === 0) return null;
  return hips.reduce((sum, point) => sum + point.y, 0) / hips.length;
}

type ReadyClip = {
  id: number;
  name: string;
  url: string;
  frames: PoseFrame[];
  cue: string;
  left: ChainAngles;
  right: ChainAngles;
  bottomKnee: number | null;
  flags: OverheadFlag[];
  span: 'full' | 'minute' | 'capped';
};

function pill(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
  text: string,
  side: 'left' | 'right',
) {
  const size = Math.max(14, canvas.width / 48);
  context.font = `600 ${size}px "Inter Variable", system-ui, sans-serif`;
  const pad = size * 0.45;
  const boxWidth = context.measureText(text).width + pad * 2;
  const boxHeight = size * 1.6;
  const raw = side === 'left' ? x - boxWidth - 10 : x + 10;
  const left = Math.min(canvas.width - boxWidth - 8, Math.max(8, raw));
  const top = Math.max(8, y - boxHeight / 2);
  context.fillStyle = 'rgba(28, 25, 23, 0.85)';
  context.beginPath();
  context.roundRect(left, top, boxWidth, boxHeight, boxHeight / 2);
  context.fill();
  context.fillStyle = '#fde68a';
  context.fillText(text, left + pad, top + size * 1.1);
}

function limb(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement, points: Point[], indexes: number[]) {
  const dots = indexes
    .map((at) => points[at])
    .filter((point): point is Point => Boolean(point && (point.visibility ?? 0) >= 0.5))
    .map((point) => ({ x: point.x * canvas.width, y: point.y * canvas.height }));
  if (dots.length < 2) return;
  const line = Math.max(3, canvas.width / 170);
  context.strokeStyle = '#fbbf24';
  context.lineWidth = line;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.beginPath();
  dots.forEach((point, at) => (at ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y)));
  context.stroke();
  for (const point of dots) {
    context.fillStyle = 'white';
    context.beginPath();
    context.arc(point.x, point.y, line * 1.3, 0, Math.PI * 2);
    context.fill();
  }
}

function drawSquat(
  canvas: HTMLCanvasElement,
  points: Point[] | null,
  labels: { shin: string; knee: string; hip: string; arm: string; neck: string },
) {
  const context = canvas.getContext('2d');
  if (!context) return;
  context.clearRect(0, 0, canvas.width, canvas.height);
  if (!points || canvas.width < 2) return;
  const pixels = toPixels(points, canvas.width, canvas.height);
  const spot = (index: number) => {
    const point = pixels[index];
    if (!point || (point.visibility ?? 0) < 0.5) return null;
    return point;
  };
  for (const side of ['left', 'right'] as const) {
    const index = side === 'right' ? RIGHT : LEFT;
    const ear = side === 'right' ? 8 : 7;
    limb(context, canvas, points, [ear, index.shoulder, index.elbow, index.wrist]);
    limb(context, canvas, points, [index.shoulder, index.hip, index.knee, index.ankle]);
    const read = chainAngles(pixels, side);
    const put = (at: number, value: number | null, name: string) => {
      if (value === null) return;
      const joint = spot(at);
      if (!joint) return;
      pill(context, canvas, joint.x, joint.y, `${name} ${Math.round(value)}°`, side);
    };
    put(index.ankle, read.shin, labels.shin);
    put(index.knee, read.knee, labels.knee);
    put(index.hip, read.hip, labels.hip);
    put(index.elbow, read.arm, labels.arm);
    put(index.shoulder, read.neck, labels.neck);
  }
}

function cueText(copy: typeof dict.ru.analyze, view: View, knees: KneeTrack | null, torso: TorsoCue | null) {
  if (view === 'front') {
    if (knees === 'in') return copy.overheadKneesIn;
    if (knees === 'out') return copy.overheadKneesOut;
    if (knees === 'over') return copy.overheadKneesOver;
    return copy.overheadUnseen;
  }
  if (torso === 'forward') return copy.overheadTorsoForward;
  if (torso === 'with') return copy.overheadTorsoWith;
  if (torso === 'upright') return copy.overheadTorsoUpright;
  return copy.overheadUnseen;
}

export default function Overhead({
  locale,
  ready,
  detect,
  onCue,
  seatKnee,
  generation = 0,
  onPerson,
}: {
  locale: Locale;
  ready: boolean;
  detect: Detect | null;
  onCue?: (text: string | null) => void;
  seatKnee?: number | null;
  generation?: number;
  onPerson?: (card: PersonOverhead | null) => void;
}) {
  const copy = dict[locale].analyze;
  const workRef = useRef<HTMLVideoElement>(null);
  const playRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const urlsRef = useRef<string[]>([]);
  const idRef = useRef(1);
  const [view, setView] = useState<View>('front');
  const [status, setStatus] = useState<'empty' | 'busy' | 'done' | 'retake'>('empty');
  const [progress, setProgress] = useState(0);
  const [still, setStill] = useState<string | null>(null);
  const [knees, setKnees] = useState<KneeTrack | null>(null);
  const [torso, setTorso] = useState<TorsoCue | null>(null);
  const [mode, setMode] = useState<'clip' | 'photos'>('clip');
  const [on, setOn] = useState(false);
  const [clips, setClips] = useState<ReadyClip[]>([]);
  const [playId, setPlayId] = useState<number | null>(null);
  const playing = clips.find((clip) => clip.id === playId) ?? null;

  useEffect(() => {
    let cancel = false;
    void fetch('/api/flags')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { subscriptionEnabled?: boolean } | null) => {
        if (!cancel) setOn(data?.subscriptionEnabled === true);
      })
      .catch(() => undefined);
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => () => {
    for (const clipUrl of urlsRef.current) URL.revokeObjectURL(clipUrl);
  }, []);

  useEffect(() => {
    if (!generation) return;
    for (const clipUrl of urlsRef.current) URL.revokeObjectURL(clipUrl);
    urlsRef.current = [];
    setClips([]);
    setPlayId(null);
    setStatus('empty');
    setProgress(0);
    setStill(null);
    setKnees(null);
    setTorso(null);
  }, [generation]);

  useEffect(() => {
    const video = playRef.current;
    if (!video || !playing || mode !== 'clip') return;
    let frame = 0;
    const labels = {
      shin: copy.overheadShin,
      knee: copy.overheadKnee,
      hip: copy.overheadHip,
      arm: copy.overheadArm,
      neck: copy.overheadNeck,
    };
    const tick = () => {
      const canvas = canvasRef.current;
      if (canvas && video.videoWidth) {
        if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
        if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;
        drawSquat(canvas, poseAt(playing.frames, video.currentTime), labels);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, mode, copy.overheadArm, copy.overheadHip, copy.overheadKnee, copy.overheadNeck, copy.overheadShin]);

  useEffect(() => {
    if (clips.length === 0) return;
    const knees = clips
      .map((clip) => clip.bottomKnee)
      .filter((value): value is number => value !== null)
      .map((value) => Math.round(value));
    const split = knees.length >= 2 && Math.max(...knees) - Math.min(...knees) > 8
      ? ` ${copy.overheadSplit.replace('{a}', String(Math.min(...knees))).replace('{b}', String(Math.max(...knees)))}`
      : '';
    onCue?.(`${clips.map((clip) => clip.cue).join(' ')}${split}`);
  }, [clips, copy.overheadSplit, onCue]);

  useEffect(() => {
    if (!playing) {
      onPerson?.(null);
      return;
    }
    const round = (side: ChainAngles): ChainAngles => ({
      shin: side.shin === null ? null : Math.round(side.shin),
      knee: side.knee === null ? null : Math.round(side.knee),
      hip: side.hip === null ? null : Math.round(side.hip),
      arm: side.arm === null ? null : Math.round(side.arm),
      neck: side.neck === null ? null : Math.round(side.neck),
    });
    onPerson?.({ left: round(playing.left), right: round(playing.right), flags: playing.flags });
  }, [onPerson, playing]);

  if (!on) return null;

  async function analyze(file: File, report: (fraction: number) => void): Promise<'ok' | 'retake'> {
    const video = workRef.current;
    if (!detect || !video) return 'retake';
    const url = URL.createObjectURL(file);
    urlsRef.current.push(url);
    video.src = url;
    const drop = () => {
      URL.revokeObjectURL(url);
      urlsRef.current = urlsRef.current.filter((item) => item !== url);
    };
    try {
      await new Promise<void>((resolve, reject) => {
        if (video.readyState >= 1 && Number.isFinite(video.duration)) resolve();
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error('video'));
      });
      const times = sampleTimes(video.duration);
      if (times.length === 0) {
        drop();
        return 'retake';
      }
      const width = 640;
      const height = Math.max(1, Math.round((width * video.videoHeight) / video.videoWidth));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) {
        drop();
        return 'retake';
      }
      const hips: Array<number | null> = [];
      const people: Array<Point[] | null> = [];
      for (let index = 0; index < times.length; index += 1) {
        const time = times[index] ?? 0;
        const frameReady = await seek(video, time);
        if (!frameReady || video.readyState < 2) {
          hips.push(null);
          people.push(null);
        } else {
          try {
            context.drawImage(video, 0, 0, width, height);
          } catch {
            hips.push(null);
            people.push(null);
            report((index + 1) / times.length);
            continue;
          }
          const poses = (detect(canvas).landmarks ?? []) as Point[][];
          const person = crowd(poses) ? null : poses[0] ?? null;
          people.push(person);
          hips.push(person ? hipY(toPixels(person, width, height)) : null);
        }
        report((index + 1) / times.length);
      }
      const at = deepestIndex(hips);
      const person = at === null ? null : people[at];
      if (at === null || !person) {
        drop();
        return 'retake';
      }
      const pixels = toPixels(person, width, height);
      const left = chainAngles(pixels, 'left');
      const right = chainAngles(pixels, 'right');
      const leftKnee = pixels[LEFT.knee];
      const rightKnee = pixels[RIGHT.knee];
      const leftAnkle = pixels[LEFT.ankle];
      const rightAnkle = pixels[RIGHT.ankle];
      const nextKnees = leftKnee && rightKnee && leftAnkle && rightAnkle
        ? kneeTrack(leftKnee, leftAnkle, rightKnee, rightAnkle)
        : null;
      const side = pickSide(pixels) === 'left' ? LEFT : RIGHT;
      const shoulder = pixels[side.shoulder];
      const hip = pixels[side.hip];
      const knee = pixels[side.knee];
      const ankle = pixels[side.ankle];
      const nextTorso = shoulder && hip && knee && ankle ? torsoAgainstShin(shoulder, hip, knee, ankle) : null;
      const sentences = [cueText(copy, 'front', nextKnees, null), nextTorso ? cueText(copy, 'side', null, nextTorso) : '']
        .filter((line) => line && line !== copy.overheadUnseen);
      const seenChain = [left, right].some((item) => Object.values(item).some((value) => value !== null));
      const frames = smoothPoses(times.map((time, index) => ({ t: time, points: people[index] ?? null })));
      const clip: ReadyClip = {
        id: idRef.current++,
        name: file.name,
        url,
        frames,
        cue: sentences.join(' ') || (seenChain ? '' : copy.overheadUnseen),
        left,
        right,
        bottomKnee: right.knee ?? left.knee,
        flags: overheadFlags(left, right, nextKnees),
        span: sampleSpan(video.duration),
      };
      setClips((rows) => [...rows, clip]);
      setPlayId(clip.id);
      return 'ok';
    } catch {
      drop();
      return 'retake';
    }
  }

  async function ingest(list: FileList | null | undefined) {
    const files = [...(list ?? [])].filter((file) => file.size > 0);
    if (files.length === 0 || status === 'busy' || !detect) return;
    setStatus('busy');
    setProgress(0);
    let ok = clips.length > 0;
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      if (!file) continue;
      const result = await analyze(file, (fraction) => setProgress((index + fraction) / files.length));
      if (result === 'ok') ok = true;
    }
    setStatus(ok ? 'done' : 'retake');
  }

  async function readPhoto(which: View, file: File | undefined) {
    if (!file || !detect) return;
    setStatus('busy');
    try {
      const image = await createImageBitmap(file);
      const width = 640;
      const height = Math.max(1, Math.round((width * image.height) / image.width));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('canvas');
      context.drawImage(image, 0, 0, width, height);
      image.close();
      const poses = (detect(canvas).landmarks ?? []) as Point[][];
      const person = crowd(poses) ? null : poses[0] ?? null;
      if (!person) {
        setStatus('retake');
        return;
      }
      const pixels = toPixels(person, width, height);
      let text = copy.overheadUnseen;
      if (which === 'front') {
        const leftKnee = pixels[LEFT.knee];
        const rightKnee = pixels[RIGHT.knee];
        const leftAnkle = pixels[LEFT.ankle];
        const rightAnkle = pixels[RIGHT.ankle];
        const track = leftKnee && rightKnee && leftAnkle && rightAnkle
          ? kneeTrack(leftKnee, leftAnkle, rightKnee, rightAnkle)
          : null;
        setKnees(track);
        text = cueText(copy, 'front', track, null);
      } else {
        const side = (pixels[RIGHT.shoulder]?.visibility ?? 0) >= (pixels[LEFT.shoulder]?.visibility ?? 0) ? RIGHT : LEFT;
        const shoulder = pixels[side.shoulder];
        const hip = pixels[side.hip];
        const knee = pixels[side.knee];
        const ankle = pixels[side.ankle];
        const lean = shoulder && hip && knee && ankle ? torsoAgainstShin(shoulder, hip, knee, ankle) : null;
        setTorso(lean);
        text = cueText(copy, 'side', null, lean);
      }
      setView(which);
      setStill(canvas.toDataURL('image/jpeg', 0.8));
      setStatus('done');
      onCue?.(text);
    } catch {
      setStatus('retake');
    }
  }

  const cue = view === 'front'
    ? (knees === 'in' ? copy.overheadKneesIn : knees === 'out' ? copy.overheadKneesOut : knees === 'over' ? copy.overheadKneesOver : copy.overheadUnseen)
    : (torso === 'forward' ? copy.overheadTorsoForward : torso === 'with' ? copy.overheadTorsoWith : torso === 'upright' ? copy.overheadTorsoUpright : copy.overheadUnseen);

  return (
    <section className="sub-layer">
      <video ref={workRef} className="film-work" muted playsInline preload="auto" />
      <p className="sub-kicker">{copy.subNote}</p>
      <h2>
        {copy.overheadTitle}
        <TextHint label={copy.overheadHelpTitle} title={copy.overheadHelpTitle} text={copy.overheadHelp} steps={copy.overheadSteps} />
      </h2>
      <p>{copy.overheadHint}</p>
      <div className="grades" role="group" aria-label={copy.overheadTitle}>
        <button type="button" className={`button ghost${mode === 'clip' ? ' is-on' : ''}`} aria-pressed={mode === 'clip'} onClick={() => setMode('clip')}>{copy.overheadClip}</button>
        <button type="button" className={`button ghost${mode === 'photos' ? ' is-on' : ''}`} aria-pressed={mode === 'photos'} onClick={() => setMode('photos')}>{copy.overheadPhotos}</button>
      </div>
      {mode === 'clip' ? (
        <>
          {playing ? (
            <div className="film-stage">
              <video ref={playRef} src={playing.url} controls playsInline />
              <canvas ref={canvasRef} aria-hidden="true" />
            </div>
          ) : null}
          <label className={`button${ready ? '' : ' is-disabled'}`}>
            {status === 'busy' ? `${copy.overheadWorking} ${Math.round(progress * 100)}%` : clips.length > 0 ? copy.overheadAdd : copy.overheadUpload}
            <input
              type="file"
              accept="video/*"
              multiple
              hidden
              disabled={!ready || status === 'busy' || !detect}
              onChange={(event) => {
                void ingest(event.target.files);
                event.target.value = '';
              }}
            />
          </label>
          {clips.length > 1 ? (
            <div className="film-switch">
              {clips.map((clip) => (
                <button
                  key={clip.id}
                  type="button"
                  className={`button ghost${clip.id === playId ? ' is-on' : ''}`}
                  aria-pressed={clip.id === playId}
                  onClick={() => setPlayId(clip.id)}
                >
                  {clip.name}
                </button>
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <div className="grades">
          <label className="button ghost">
            {copy.overheadFrontPhoto}
            <input type="file" accept="image/*" hidden disabled={!ready || !detect} onChange={(event) => { void readPhoto('front', event.target.files?.[0]); event.target.value = ''; }} />
          </label>
          <label className="button ghost">
            {copy.overheadSidePhoto}
            <input type="file" accept="image/*" hidden disabled={!ready || !detect} onChange={(event) => { void readPhoto('side', event.target.files?.[0]); event.target.value = ''; }} />
          </label>
        </div>
      )}
      {status === 'retake' ? <p className="warn">{copy.retake}</p> : null}
      {playing && mode === 'clip' ? (
        <div className="overhead-result">
          {playing.cue ? <p>{playing.cue}</p> : null}
          {[playing.left, playing.right].map((side, index) => {
            const line = [
              side.shin != null ? `${copy.overheadShin} ${Math.round(side.shin)}°` : null,
              side.knee != null ? `${copy.overheadKnee} ${Math.round(side.knee)}°` : null,
              side.hip != null ? `${copy.overheadHip} ${Math.round(side.hip)}°` : null,
              side.arm != null ? `${copy.overheadArm} ${Math.round(side.arm)}°` : null,
              side.neck != null ? `${copy.overheadNeck} ${Math.round(side.neck)}°` : null,
            ].filter(Boolean).join(' · ');
            if (!line) return null;
            return <p key={index === 0 ? 'left' : 'right'}>{index === 0 ? copy.overheadLeft : copy.overheadRight}: {line}</p>;
          })}
          {playing.left.knee != null && playing.right.knee != null ? <p className="note">{copy.overheadCompare}</p> : null}
          <h3>{copy.overheadBriefTitle}</h3>
          <p>{copy.overheadNotRide}</p>
          {playing.left.neck != null || playing.right.neck != null ? <p>{copy.overheadNeckNote}</p> : null}
          {playing.flags.map((flag) => (
            <p key={flag}>{
              flag === 'knees-in' ? copy.overheadFlagKneesIn
              : flag === 'knees-over' ? copy.overheadFlagKneesOver
              : flag === 'knees-out' ? copy.overheadFlagKneesOut
              : flag === 'shin-uneven' ? copy.overheadFlagShin
              : flag === 'neck-uneven' ? copy.overheadFlagNeck
              : flag === 'arms-open' ? copy.overheadFlagArmsOpen
              : flag === 'arms-short' ? copy.overheadFlagArmsShort
              : copy.overheadFlagHip
            }</p>
          ))}
          {seatKnee != null ? <p>{copy.overheadSeat.replace('{n}', String(Math.round(seatKnee)))}</p> : null}
          <p className="note">{copy.overheadStay}</p>
          {playing.span === 'minute' ? <p className="note">{copy.videoMinute}</p> : null}
          {playing.span === 'capped' ? <p className="note">{copy.videoLong}</p> : null}
        </div>
      ) : null}
      {mode === 'photos' && status === 'done' ? (
        <div className="overhead-result">
          {still ? <img src={still} alt="" /> : null}
          <p>{cue}</p>
          {view === 'front' ? <p className="note">{copy.overheadCompare}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
