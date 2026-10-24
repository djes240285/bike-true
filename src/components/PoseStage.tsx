import { useEffect, useRef, useState } from 'react';
import type { Dict } from '../i18n';
import { JOINT_NAMES, lerpJoints, type Joints } from '../lib/target';

export type Scene = {
  image: ImageBitmap;
  current: Joints;
  ideal: Joints;
  changed: boolean;
};

const MAX_WIDTH = 1280;
const CYCLE_MS = 5200;
const AMBER = '#fbbf24';
const AMBER_DEEP = '#d97706';

/** 0 — как сейчас, 1 — ориентир. Пауза, переход, пауза, возврат. */
function phase(time: number): number {
  const t = (time % CYCLE_MS) / CYCLE_MS;
  const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);
  if (t < 0.2) return 0;
  if (t < 0.45) return ease((t - 0.2) / 0.25);
  if (t < 0.8) return 1;
  return 1 - ease((t - 0.8) / 0.2);
}

function draw(context: CanvasRenderingContext2D, scene: Scene, scale: number, k: number, copy: Dict['analyze']) {
  const { width, height } = context.canvas;
  context.clearRect(0, 0, width, height);
  context.drawImage(scene.image, 0, 0, width, height);
  context.fillStyle = 'rgba(28, 25, 23, 0.22)';
  context.fillRect(0, 0, width, height);

  const line = Math.max(3, width / 170);
  const at = (joints: Joints) => JOINT_NAMES.map((name) => ({ x: joints[name].x * scale, y: joints[name].y * scale }));

  if (scene.changed) {
    context.save();
    context.setLineDash([line * 2.2, line * 1.8]);
    context.strokeStyle = 'rgba(255, 255, 255, 0.92)';
    context.lineWidth = line * 0.8;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.beginPath();
    at(scene.ideal).forEach((point, index) => (index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y)));
    context.stroke();
    context.restore();
  }

  const live = at(lerpJoints(scene.current, scene.ideal, k));
  context.strokeStyle = AMBER;
  context.lineWidth = line;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.beginPath();
  live.forEach((point, index) => (index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y)));
  context.stroke();
  for (const point of live) {
    context.fillStyle = 'white';
    context.beginPath();
    context.arc(point.x, point.y, line * 1.5, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = AMBER_DEEP;
    context.beginPath();
    context.arc(point.x, point.y, line * 0.9, 0, Math.PI * 2);
    context.fill();
  }

  if (scene.changed) {
    const label = k > 0.5 ? copy.ghostTarget : copy.ghostNow;
    const size = Math.max(16, width / 34);
    context.font = `600 ${size}px "Inter Variable", system-ui, sans-serif`;
    const pad = size * 0.7;
    const boxWidth = context.measureText(label).width + pad * 2;
    const boxHeight = size * 1.9;
    context.fillStyle = 'rgba(28, 25, 23, 0.85)';
    context.beginPath();
    context.roundRect(pad, pad, boxWidth, boxHeight, boxHeight / 2);
    context.fill();
    context.fillStyle = k > 0.5 ? '#fde68a' : 'white';
    context.fillText(label, pad * 2, pad + boxHeight * 0.66);
  }
}

function pickVideoType() {
  if (typeof MediaRecorder === 'undefined') return null;
  const types = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'];
  return types.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export default function PoseStage({ scene, copy, name }: { scene: Scene; copy: Dict['analyze']; name: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [recording, setRecording] = useState(false);
  const videoType = useRef<string | null>(null);
  const scale = Math.min(1, MAX_WIDTH / scene.image.width);

  useEffect(() => {
    videoType.current = pickVideoType();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    canvas.width = Math.round(scene.image.width * scale);
    canvas.height = Math.round(scene.image.height * scale);
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches || !scene.changed;
    if (still) {
      draw(context, scene, scale, 0, copy);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      draw(context, scene, scale, phase(now - start), copy);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [scene, scale, copy]);

  function saveImage() {
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(scene.image.width * scale);
    canvas.height = Math.round(scene.image.height * scale);
    const context = canvas.getContext('2d');
    if (!context) return;
    draw(context, scene, scale, 0, copy);
    canvas.toBlob((blob) => blob && download(blob, `biketrue-${name}.png`), 'image/png');
  }

  function saveVideo() {
    const canvas = canvasRef.current;
    const type = videoType.current;
    if (!canvas || !type || recording) return;
    const recorder = new MediaRecorder(canvas.captureStream(30), { mimeType: type, videoBitsPerSecond: 6_000_000 });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => event.data.size && chunks.push(event.data);
    recorder.onstop = () => {
      setRecording(false);
      download(new Blob(chunks, { type }), `biketrue-${name}.${type.startsWith('video/mp4') ? 'mp4' : 'webm'}`);
    };
    setRecording(true);
    recorder.start(250);
    setTimeout(() => recorder.stop(), CYCLE_MS);
  }

  return (
    <div className="pose-stage">
      <div className="stage">
        <canvas ref={canvasRef} />
      </div>
      <p className="muted">{scene.changed ? copy.ghostLegend : copy.ghostAllIn}</p>
      <div className="actions">
        <button className="button ghost" type="button" onClick={saveImage}>
          {copy.saveImage}
        </button>
        {scene.changed && pickVideoType() ? (
          <button className="button ghost" type="button" onClick={saveVideo} disabled={recording}>
            {recording ? copy.recording : copy.saveVideo}
          </button>
        ) : null}
      </div>
    </div>
  );
}
