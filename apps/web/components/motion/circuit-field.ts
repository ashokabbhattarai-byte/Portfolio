/* A procedural circuit board: orthogonal traces with rounded corners, solder
   pads, and signals that travel the traces continuously.

   Two canvases rather than one. The board itself never changes between
   resizes, so it is painted once onto the lower canvas; only the travelling
   signals are cleared and repainted each frame, and there are never more than
   a few dozen of those. That keeps a full-bleed background under a
   millisecond of work per frame instead of redrawing hundreds of paths. */

type Point = { x: number; y: number };

type Trace = {
  /* Already flattened through the corner arcs, so the signals travel the
     exact geometry that is painted rather than cutting the corners. */
  points: Point[];
  marks: number[];
  total: number;
  depth: number;
  /** Bounds, so the pointer can reject most traces without touching a point. */
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

type Pulse = {
  trace: Trace;
  head: number;
  speed: number;
  tail: number;
  rest: number;
  /** Last painted head, reused to test pointer proximity without a re-walk. */
  at: Point | null;
};

type Pad = {
  x: number;
  y: number;
  w: number;
  h: number;
  dot: boolean;
  /** A minority of pads are lit rather than etched, as on the reference board. */
  hot: boolean;
  depth: number;
  phase: number;
  rate: number;
};

const TRACE = '28, 116, 199';
const LIVE = '46, 190, 255';
const HOT = '150, 238, 255';

const rgba = (channels: string, alpha: number) =>
  `rgba(${channels}, ${alpha.toFixed(3)})`;

/* Seeded so the board is identical on every load: the same page screenshots
   the same way, and a resize does not reshuffle the whole composition. */
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const lerp = (a: Point, b: Point, t: number): Point => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});

const span = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);

/* Replaces each corner with a quadratic fillet sampled into points, so the
   painted trace and the travelling signal share one polyline. */
function roundCorners(points: Point[], radius: number, steps: number): Point[] {
  if (points.length < 3) return points;
  const out: Point[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const before = points[i - 1];
    const corner = points[i];
    const after = points[i + 1];
    const reach = Math.min(
      radius,
      span(before, corner) / 2,
      span(corner, after) / 2,
    );
    if (reach < 2) {
      out.push(corner);
      continue;
    }
    const enter = lerp(corner, before, reach / span(before, corner));
    const exit = lerp(corner, after, reach / span(corner, after));
    out.push(enter);
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const inv = 1 - t;
      out.push({
        x: inv * inv * enter.x + 2 * inv * t * corner.x + t * t * exit.x,
        y: inv * inv * enter.y + 2 * inv * t * corner.y + t * t * exit.y,
      });
    }
    out.push(exit);
  }
  out.push(points[points.length - 1]);
  return out;
}

function measureTrace(points: Point[], depth: number): Trace {
  const marks = [0];
  let total = 0;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const point of points) {
    if (point.x < minX) minX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.x > maxX) maxX = point.x;
    if (point.y > maxY) maxY = point.y;
  }
  for (let i = 1; i < points.length; i++) {
    total += span(points[i - 1], points[i]);
    marks.push(total);
  }
  return { points, marks, total, depth, minX, minY, maxX, maxY };
}

const withinBounds = (trace: Trace, x: number, y: number, reach: number) =>
  x >= trace.minX - reach &&
  x <= trace.maxX + reach &&
  y >= trace.minY - reach &&
  y <= trace.maxY + reach;

/** Appends to the current path rather than starting one, so every trace the
    pointer touches can be lit by a single gradient stroke. */
function addPolyline(ctx: CanvasRenderingContext2D, points: Point[]) {
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
}

/* One trace: enters off-frame, turns a handful of times on a 24px grid, and
   leaves off-frame. Running past the edges is what stops the field from
   reading as a self-contained rectangle of decoration. */
function buildTrace(
  rand: () => number,
  w: number,
  h: number,
  steps: number,
): Point[] {
  const grid = 24;
  const snap = (value: number) => Math.round(value / grid) * grid;
  const fromLeft = rand() < 0.62;
  let x = fromLeft ? -80 : snap(rand() * w);
  let y = fromLeft ? snap(rand() * h) : -80;
  const points: Point[] = [{ x, y }];
  let horizontal = fromLeft;
  const turns = 3 + Math.floor(rand() * 5);
  for (let i = 0; i < turns; i++) {
    const run = snap(48 + rand() * 260) * (rand() < 0.18 ? -1 : 1);
    if (horizontal) x = Math.max(-100, Math.min(w + 100, x + run));
    else y = Math.max(-100, Math.min(h + 100, y + run));
    const last = points[points.length - 1];
    if (last.x !== x || last.y !== y) points.push({ x, y });
    horizontal = !horizontal;
  }
  if (horizontal) points.push({ x: w + 100, y });
  else points.push({ x, y: h + 100 });
  return roundCorners(points, 14, steps);
}

function strokeFrom(ctx: CanvasRenderingContext2D, points: Point[]) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
}

/* Builds the sub-path between two distances along a trace. */
function carve(
  ctx: CanvasRenderingContext2D,
  trace: Trace,
  from: number,
  to: number,
) {
  const { points, marks } = trace;
  let open = false;
  ctx.beginPath();
  for (let i = 1; i < points.length; i++) {
    const start = marks[i - 1];
    const end = marks[i];
    if (end < from || start > to) continue;
    const length = end - start || 1;
    const head = lerp(
      points[i - 1],
      points[i],
      (Math.max(from, start) - start) / length,
    );
    const tail = lerp(
      points[i - 1],
      points[i],
      (Math.min(to, end) - start) / length,
    );
    if (!open) {
      ctx.moveTo(head.x, head.y);
      open = true;
    }
    ctx.lineTo(tail.x, tail.y);
  }
  return open;
}

function pointAt(trace: Trace, distance: number): Point {
  const { points, marks } = trace;
  for (let i = 1; i < points.length; i++) {
    if (marks[i] < distance) continue;
    const length = marks[i] - marks[i - 1] || 1;
    return lerp(points[i - 1], points[i], (distance - marks[i - 1]) / length);
  }
  return points[points.length - 1];
}

export type CircuitOptions = {
  /** Multiplies the generated trace count; the footer wants a calmer board. */
  density?: number;
  seed?: number;
};

/**
 * Mounts the field into `host` and returns a teardown function.
 *
 * The caller owns nothing inside `host` — the canvases are created here, so
 * React never reconciles them and the whole thing survives re-renders.
 */
export function circuitField(
  host: HTMLElement,
  { density = 1, seed = 20260919 }: CircuitOptions = {},
) {
  const coarseInput =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches;
  /* The board is drawn larger than the host on every side, so the parallax
     shift can never drag an empty edge into view. Touch has no parallax and
     therefore no margin to pay for. */
  const margin = coarseInput ? 0 : 28;
  const shift = coarseInput ? 0 : 16;
  /* How far the pointer's light reaches along the traces. */
  const reach = 310;

  const board = document.createElement('canvas');
  const live = document.createElement('canvas');
  for (const canvas of [board, live]) {
    canvas.setAttribute('aria-hidden', 'true');
    Object.assign(canvas.style, {
      position: 'absolute',
      left: `${-margin}px`,
      top: `${-margin}px`,
      width: `calc(100% + ${margin * 2}px)`,
      height: `calc(100% + ${margin * 2}px)`,
      willChange: margin ? 'transform' : 'auto',
    });
    host.append(canvas);
  }
  const boardRaw = board.getContext('2d');
  const liveRaw = live.getContext('2d');
  if (!boardRaw || !liveRaw) {
    board.remove();
    live.remove();
    return () => {};
  }
  /* Aliased through a typed binding because the painters below are hoisted
     function declarations, which do not inherit the narrowing above. */
  const boardContext: CanvasRenderingContext2D = boardRaw;
  const liveContext: CanvasRenderingContext2D = liveRaw;

  const coarse = coarseInput;
  /* Phones carry the highest pixel ratios and the weakest fill rate, so the
     ratio is capped harder there than on a desktop display. */
  const ratio = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2);
  const corners = coarse ? 4 : 7;

  /* `width`/`height` are the drawing surface, which includes the margin;
     `hostW`/`hostH` are the element the pointer is measured against. */
  let width = 0;
  let height = 0;
  let hostW = 0;
  let hostH = 0;
  let traces: Trace[] = [];
  let pads: Pad[] = [];
  let pulses: Pulse[] = [];
  let frame = 0;
  let last = 0;
  let onScreen = false;
  let calm = false;

  /* Pointer state, all in host space. The eased pair trails the raw pair so
     the light has weight instead of snapping to the cursor, and `lit` fades
     the whole response in and out rather than popping it. */
  let aimX = 0;
  let aimY = 0;
  let easeX = 0;
  let easeY = 0;
  let lit = 0;
  let pointerOn = false;
  let driftX = 0;
  let driftY = 0;
  let surges: { x: number; y: number; age: number }[] = [];

  function build() {
    const rand = seeded(seed);
    const area = width * height;
    const target = Math.round(
      Math.min(
        64,
        Math.max(10, (area / 26000) * density * (coarse ? 0.85 : 1)),
      ),
    );
    traces = [];
    pads = [];
    for (let i = 0; i < target; i++) {
      const depth = rand();
      const trace = measureTrace(
        buildTrace(rand, width, height, corners),
        depth,
      );
      traces.push(trace);
      /* Pads sit on the trace they belong to, the way a real board solders a
         component onto the line rather than scattering squares behind it. */
      const count = rand() < 0.45 ? 2 : 1;
      for (let p = 0; p < count; p++) {
        const at = pointAt(trace, trace.total * (0.2 + rand() * 0.65));
        const dot = rand() < 0.3;
        const size = dot ? 3 + rand() * 3 : 9 + rand() * 20;
        pads.push({
          x: at.x,
          y: at.y,
          w: size,
          h: dot ? size : 9 + rand() * 12,
          dot,
          hot: rand() < 0.16,
          depth,
          phase: rand() * Math.PI * 2,
          rate: rand() < 0.35 ? 0.4 + rand() * 0.8 : 0,
        });
      }
    }
    const flowing = Math.min(traces.length, coarse ? 18 : 44);
    pulses = [];
    for (let i = 0; i < flowing; i++) {
      const trace = traces[i];
      pulses.push({
        trace,
        head: rand() * trace.total,
        speed: 90 + rand() * 210,
        tail: 40 + rand() * 130,
        rest: 0,
        at: null,
      });
    }
  }

  function paintBoard() {
    boardContext.clearRect(0, 0, width, height);
    boardContext.lineCap = 'round';
    boardContext.lineJoin = 'round';
    for (const trace of traces) {
      boardContext.strokeStyle = rgba(TRACE, 0.14 + trace.depth * 0.26);
      boardContext.lineWidth = 0.7 + trace.depth * 0.9;
      strokeFrom(boardContext, trace.points);
      boardContext.stroke();
    }
    for (const pad of pads) {
      boardContext.fillStyle = pad.hot
        ? rgba(LIVE, 0.4 + pad.depth * 0.45)
        : rgba(TRACE, 0.16 + pad.depth * 0.3);
      if (pad.dot) {
        boardContext.beginPath();
        boardContext.arc(pad.x, pad.y, pad.w, 0, Math.PI * 2);
        boardContext.fill();
      } else {
        boardContext.fillRect(
          pad.x - pad.w / 2,
          pad.y - pad.h / 2,
          pad.w,
          pad.h,
        );
      }
    }
  }

  /* Pointer position in board space: host coordinates, plus the margin the
     board is drawn at, less the parallax the canvas has been shifted by. */
  let lightX = 0;
  let lightY = 0;

  function paintLive(elapsed: number, delta: number) {
    lightX = easeX + margin - driftX;
    lightY = easeY + margin - driftY;
    liveContext.clearRect(0, 0, width, height);
    liveContext.globalCompositeOperation = 'lighter';
    liveContext.lineCap = 'round';
    liveContext.lineJoin = 'round';
    for (const pulse of pulses) {
      if (pulse.rest > 0) {
        pulse.rest -= delta;
        continue;
      }
      /* Signals hurry as they pass under the cursor, so the board reads as
         reacting to you rather than merely being lit by you. */
      let urge = 1;
      if (lit > 0.01 && pulse.at) {
        const away = Math.hypot(pulse.at.x - lightX, pulse.at.y - lightY);
        if (away < reach) urge += (1 - away / reach) * 1.6 * lit;
      }
      pulse.head += pulse.speed * urge * delta;
      if (pulse.head - pulse.tail > pulse.trace.total) {
        pulse.head = 0;
        pulse.rest = Math.random() * 2.5;
        continue;
      }
      const to = Math.min(pulse.head, pulse.trace.total);
      const from = Math.max(0, pulse.head - pulse.tail);
      if (to <= from) continue;
      const glow = 0.3 + pulse.trace.depth * 0.5;
      /* One path, stroked twice: a wide dim pass for the bloom and a thin
         bright pass for the signal. Cheaper than a shadow blur and it looks
         the same at this scale. */
      if (!carve(liveContext, pulse.trace, from, to)) continue;
      liveContext.strokeStyle = rgba(LIVE, 0.1 * glow);
      liveContext.lineWidth = 7;
      liveContext.stroke();
      liveContext.strokeStyle = rgba(HOT, 0.5 * glow);
      liveContext.lineWidth = 1.5;
      liveContext.stroke();
      const spark = pointAt(pulse.trace, to);
      pulse.at = spark;
      liveContext.fillStyle = rgba(HOT, 0.75 * glow);
      liveContext.beginPath();
      liveContext.arc(spark.x, spark.y, 1.6, 0, Math.PI * 2);
      liveContext.fill();
    }
    for (const pad of pads) {
      if (!pad.rate) continue;
      const beat = 0.5 + 0.5 * Math.sin(elapsed * pad.rate + pad.phase);
      liveContext.fillStyle = rgba(LIVE, 0.06 + beat * 0.3 * pad.depth);
      if (pad.dot) {
        liveContext.beginPath();
        liveContext.arc(pad.x, pad.y, pad.w, 0, Math.PI * 2);
        liveContext.fill();
      } else {
        liveContext.fillRect(
          pad.x - pad.w / 2,
          pad.y - pad.h / 2,
          pad.w,
          pad.h,
        );
      }
    }
    /* The pointer's wake. A radial gradient is used as the stroke style, so
       one path containing every nearby trace falls off correctly with
       distance — no per-segment alpha, one stroke call for the whole wake. */
    if (lit > 0.01) {
      const halo = liveContext.createRadialGradient(
        lightX,
        lightY,
        0,
        lightX,
        lightY,
        reach,
      );
      halo.addColorStop(0, rgba(HOT, 0.8 * lit));
      halo.addColorStop(0.35, rgba(LIVE, 0.45 * lit));
      halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
      liveContext.beginPath();
      let touched = false;
      for (const trace of traces) {
        if (!withinBounds(trace, lightX, lightY, reach)) continue;
        addPolyline(liveContext, trace.points);
        touched = true;
      }
      if (touched) {
        /* Three passes over the one path: bloom, body, filament. */
        liveContext.strokeStyle = halo;
        liveContext.lineWidth = 7;
        liveContext.globalAlpha = 0.35;
        liveContext.stroke();
        liveContext.globalAlpha = 1;
        liveContext.lineWidth = 2.2;
        liveContext.stroke();
        liveContext.lineWidth = 0.9;
        liveContext.stroke();
      }
      liveContext.fillStyle = halo;
      for (const pad of pads) {
        if (Math.abs(pad.x - lightX) > reach) continue;
        if (Math.abs(pad.y - lightY) > reach) continue;
        if (pad.dot) {
          liveContext.beginPath();
          liveContext.arc(pad.x, pad.y, pad.w + 1, 0, Math.PI * 2);
          liveContext.fill();
        } else {
          liveContext.fillRect(
            pad.x - pad.w / 2,
            pad.y - pad.h / 2,
            pad.w,
            pad.h,
          );
        }
      }
    }

    /* A click sends a ring outward through the board. Same trick as the
       wake, with the gradient's bright stop riding the expanding radius. */
    for (const surge of surges) {
      surge.age += delta;
      const life = 1 - surge.age / 0.9;
      if (life <= 0) continue;
      const edge = surge.age * 1000;
      const ring = liveContext.createRadialGradient(
        surge.x,
        surge.y,
        Math.max(0, edge - 90),
        surge.x,
        surge.y,
        edge + 10,
      );
      ring.addColorStop(0, 'rgba(0, 0, 0, 0)');
      ring.addColorStop(0.75, rgba(HOT, 0.7 * life));
      ring.addColorStop(1, 'rgba(0, 0, 0, 0)');
      liveContext.beginPath();
      let hit = false;
      for (const trace of traces) {
        if (!withinBounds(trace, surge.x, surge.y, edge + 10)) continue;
        addPolyline(liveContext, trace.points);
        hit = true;
      }
      if (!hit) continue;
      liveContext.strokeStyle = ring;
      liveContext.lineWidth = 5;
      liveContext.globalAlpha = 0.4;
      liveContext.stroke();
      liveContext.globalAlpha = 1;
      liveContext.lineWidth = 1.8;
      liveContext.stroke();
    }
    if (surges.length) surges = surges.filter((surge) => surge.age < 0.9);

    liveContext.globalCompositeOperation = 'source-over';
  }

  function step(now: number) {
    /* Clamped so a backgrounded tab returning after ten seconds does not
       teleport every signal to the far end of its trace. */
    const delta = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    /* Frame-rate independent easing, so the trail feels the same on 60Hz and
       120Hz panels instead of twice as fast on one of them. */
    const chase = 1 - Math.pow(0.0015, delta);
    easeX += (aimX - easeX) * chase;
    easeY += (aimY - easeY) * chase;
    lit += ((pointerOn ? 1 : 0) - lit) * (1 - Math.pow(0.004, delta));
    if (shift && hostW && hostH) {
      const wantX = pointerOn ? (0.5 - easeX / hostW) * 2 * shift : 0;
      const wantY = pointerOn ? (0.5 - easeY / hostH) * 2 * shift : 0;
      driftX += (wantX - driftX) * (1 - Math.pow(0.02, delta));
      driftY += (wantY - driftY) * (1 - Math.pow(0.02, delta));
      const move = `translate3d(${driftX.toFixed(2)}px, ${driftY.toFixed(2)}px, 0)`;
      board.style.transform = move;
      live.style.transform = move;
    }
    paintLive(now / 1000, delta);
    frame = requestAnimationFrame(step);
  }

  function stop() {
    if (!frame) return;
    cancelAnimationFrame(frame);
    frame = 0;
  }

  function play() {
    if (frame || !onScreen || calm || document.hidden || !width) return;
    last = performance.now();
    frame = requestAnimationFrame(step);
  }

  function resize() {
    const next = host.getBoundingClientRect();
    const w = Math.round(next.width);
    const h = Math.round(next.height);
    if (!w || !h) return;
    /* Mobile browsers resize the viewport as the URL bar hides, which would
       otherwise rebuild the whole board mid-scroll. Height has to move a long
       way before it counts. */
    const drawW = w + margin * 2;
    const drawH = h + margin * 2;
    if (drawW === width && Math.abs(drawH - height) < (coarse ? 120 : 1))
      return;
    hostW = w;
    hostH = h;
    width = drawW;
    height = drawH;
    const layers: [HTMLCanvasElement, CanvasRenderingContext2D][] = [
      [board, boardContext],
      [live, liveContext],
    ];
    for (const [canvas, context] of layers) {
      canvas.width = Math.round(drawW * ratio);
      canvas.height = Math.round(drawH * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    build();
    paintBoard();
    paintLive(0, 0);
  }

  function settle() {
    calm = document.documentElement.dataset.flow === 'calm';
    if (calm) {
      stop();
      /* Reduced motion still gets the board, just no travelling signal and no
         pointer response — including the parallax, which has to be unwound. */
      pointerOn = false;
      lit = 0;
      surges = [];
      driftX = 0;
      driftY = 0;
      board.style.transform = '';
      live.style.transform = '';
      host.dataset.warm = 'false';
      liveContext.clearRect(0, 0, width, height);
    } else {
      play();
    }
  }

  const observer =
    typeof IntersectionObserver === 'function'
      ? new IntersectionObserver((entries) => {
          onScreen = entries.some((entry) => entry.isIntersecting);
          if (onScreen) play();
          else stop();
        })
      : null;
  if (observer) observer.observe(host);
  else {
    onScreen = true;
  }

  const sizes =
    typeof ResizeObserver === 'function'
      ? new ResizeObserver(() => resize())
      : null;
  if (sizes) sizes.observe(host);

  const visibility = () => (document.hidden ? stop() : play());
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* Listening on the section rather than the backdrop: the backdrop is
     pointer-events:none, and the content sitting on top of it would otherwise
     swallow every move event. */
  const surface = host.parentElement ?? host;

  const aim = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse' || calm) return;
    const box = host.getBoundingClientRect();
    aimX = event.clientX - box.left;
    aimY = event.clientY - box.top;
    if (!pointerOn) {
      /* First move inside: start the trail where the cursor is, or it would
         visibly fly in from the last place the pointer left. */
      easeX = aimX;
      easeY = aimY;
    }
    pointerOn = true;
    host.style.setProperty('--warm-x', `${aimX}px`);
    host.style.setProperty('--warm-y', `${aimY}px`);
    host.dataset.warm = 'true';
  };
  const release = () => {
    pointerOn = false;
    host.dataset.warm = 'false';
  };
  const press = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse' || calm) return;
    const box = host.getBoundingClientRect();
    surges.push({
      x: event.clientX - box.left + margin - driftX,
      y: event.clientY - box.top + margin - driftY,
      age: 0,
    });
    if (surges.length > 4) surges.shift();
  };

  resize();
  settle();
  surface.addEventListener('pointermove', aim, { passive: true });
  surface.addEventListener('pointerleave', release);
  surface.addEventListener('pointerdown', press, { passive: true });
  window.addEventListener('resize', resize);
  window.addEventListener('portfolio:flow', settle);
  media.addEventListener('change', settle);
  document.addEventListener('visibilitychange', visibility);

  return () => {
    stop();
    observer?.disconnect();
    sizes?.disconnect();
    surface.removeEventListener('pointermove', aim);
    surface.removeEventListener('pointerleave', release);
    surface.removeEventListener('pointerdown', press);
    window.removeEventListener('resize', resize);
    window.removeEventListener('portfolio:flow', settle);
    media.removeEventListener('change', settle);
    document.removeEventListener('visibilitychange', visibility);
    board.remove();
    live.remove();
  };
}
