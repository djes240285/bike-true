import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Dict } from '../i18n';
import type { Point } from '../lib/geometry';
import { JOINT_NAMES, lerpJoints, type Joints } from '../lib/target';

export type Scene = {
  image: ImageBitmap;
  current: Joints;
  ideal: Joints;
  changed: boolean;
  wish?: Joints | null;
};

const MAX_WIDTH = 1280;
const CYCLE_MS = 5200;
const AMBER = '#fbbf24';
const AMBER_DEEP = '#d97706';
const BLUE = '#3d7eff';

/** 0 — как сейчас, 1 — ориентир. Пауза, переход, пауза, возврат. */
function phase(time: number): number {
  const t = (time % CYCLE_MS) / CYCLE_MS;
  const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);
  if (t < 0.2) return 0;
  if (t < 0.45) return ease((t - 0.2) / 0.25);
  if (t < 0.8) return 1;
  return 1 - ease((t - 0.8) / 0.2);
}

function draw(context: CanvasRenderingContext2D, scene: Scene, scale: number, k: number, copy: Dict['analyze'], marks: Point[]) {
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

  if (scene.wish) {
    context.save();
    context.strokeStyle = BLUE;
    context.lineWidth = line * 1.35;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.beginPath();
    at(scene.wish).forEach((point, index) => (index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y)));
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

  marks.forEach((mark, index) => {
    const radius = line * 2.4;
    context.fillStyle = '#fde68a';
    context.beginPath();
    context.arc(mark.x * scale, mark.y * scale, radius, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#1c1917';
    context.font = `700 ${Math.round(radius * 1.15)}px "Inter Variable", system-ui, sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(String(index + 1), mark.x * scale, mark.y * scale + radius * 0.08);
  });
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

export default function PoseStage({
  scene,
  copy,
  name,
  marks = [],
  onMark,
}: {
  scene: Scene;
  copy: Dict['analyze'];
  name: string;
  marks?: Point[];
  onMark?: (point: Point) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);
  const dragged = useRef(false);
  const view = useRef({ zoom: 1, x: 0, y: 0 });
  view.current = { zoom, x: pan.x, y: pan.y };
  const [recording, setRecording] = useState(false);
  const videoType = useRef<string | null>(null);
  const scale = Math.min(1, MAX_WIDTH / scene.image.width);

  useEffect(() => {
    videoType.current = pickVideoType();
  }, []);

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [scene.image]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    function onWheel(event: WheelEvent) {
      if (view.current.zoom <= 1) return;
      event.preventDefault();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? stage.clientHeight : 1;
      setPan(clampPan(view.current.x - event.deltaX * unit, view.current.y - event.deltaY * unit, view.current.zoom));
    }
    stage.addEventListener('wheel', onWheel, { passive: false });
    return () => stage.removeEventListener('wheel', onWheel);
  }, [scene.image]);

  function clampPan(x: number, y: number, nextZoom: number) {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return { x, y };
    const limitX = Math.max(0, canvas.offsetWidth * (nextZoom - 1) / 2);
    const limitY = Math.max(0, canvas.offsetHeight * (nextZoom - 1) / 2);
    return {
      x: Math.min(limitX, Math.max(-limitX, x)),
      y: Math.min(limitY, Math.max(-limitY, y)),
    };
  }

  function changeZoom(next: number) {
    const value = Math.min(5, Math.max(1, Math.round(next * 100) / 100));
    setZoom(value);
    setPan((current) => clampPan(current.x, current.y, value));
  }

  function place(event: ReactPointerEvent) {
    if (!onMark) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const x = ((event.clientX - rect.left) / rect.width) * scene.image.width;
    const y = ((event.clientY - rect.top) / rect.height) * scene.image.height;
    if (x < 0 || y < 0 || x > scene.image.width || y > scene.image.height) return;
    onMark({ x, y, visibility: 1 });
  }

  function pointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest('.zoom-bar')) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    dragged.current = false;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom };
      dragged.current = true;
    }
  }

  function pointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    const dx = event.clientX - previous.x;
    const dy = event.clientY - previous.y;
    if (Math.hypot(dx, dy) > 8) {
      dragged.current = true;
      if (view.current.zoom > 1) setDragging(true);
    }
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size >= 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      changeZoom(pinch.current.zoom * (distance / pinch.current.distance));
      return;
    }
    if (view.current.zoom > 1 && dragged.current) setPan((current) => clampPan(current.x + dx, current.y + dy, view.current.zoom));
  }

  function pointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const pinching = pointers.current.size >= 2;
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (!pinching && !dragged.current) place(event);
    if (pointers.current.size === 0) setDragging(false);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    canvas.width = Math.round(scene.image.width * scale);
    canvas.height = Math.round(scene.image.height * scale);
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches || !scene.changed;
    if (still) {
      draw(context, scene, scale, 0, copy, marks);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      draw(context, scene, scale, phase(now - start), copy, marks);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [scene, scale, copy, marks]);

  function saveImage() {
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(scene.image.width * scale);
    canvas.height = Math.round(scene.image.height * scale);
    const context = canvas.getContext('2d');
    if (!context) return;
    draw(context, scene, scale, 0, copy, marks);
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
      <div
        className="stage"
        ref={stageRef}
        style={{ touchAction: zoom > 1 ? 'none' : 'pan-y', cursor: dragging ? 'grabbing' : onMark ? 'crosshair' : zoom > 1 ? 'grab' : undefined }}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={pointerUp}
      >
        <canvas
          ref={canvasRef}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            cursor: dragging ? 'grabbing' : onMark ? 'crosshair' : zoom > 1 ? 'grab' : undefined,
          }}
        />
        <div className="zoom-bar">
          <button type="button" aria-label={copy.zoomOut} onClick={() => changeZoom(zoom / 1.5)}>−</button>
          <button type="button" aria-label={copy.zoomReset} onClick={() => changeZoom(1)}>{zoom === 1 ? '1×' : `${zoom.toFixed(1)}×`}</button>
          <button type="button" aria-label={copy.zoomIn} onClick={() => changeZoom(zoom * 1.5)}>+</button>
        </div>
      </div>
      <p className="muted">{scene.wish ? copy.wishBlue : scene.changed ? copy.ghostLegend : copy.ghostAllIn}</p>
      {onMark ? <p className="muted">{marks.length >= 2 ? copy.crankDone : marks.length === 1 ? copy.crankNext : copy.crankMark}</p> : null}
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
