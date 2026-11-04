import { useEffect, useRef, useState, type ReactNode } from "react";
import { Hammer, Volume2, VolumeX, Warehouse } from "lucide-react";
import {
  playDeny,
  playHire,
  playSwing,
  playUpgrade,
  resumeAudio,
  setMuted,
  unlockAudio,
} from "@/game/audio";
import { formatDuration, formatNumber } from "@/game/format";
import { clearMine, loadMine, saveMine } from "@/game/save";
import {
  applyOffline,
  freshMine,
  fullyCrewed,
  hireManager,
  MANAGER_COSTS,
  MANAGER_TITLES,
  nextManager,
  rates,
  shaftRate,
  shaftUpgradeCost,
  stationUpgradeCost,
  swing,
  tick,
  upgradeElevator,
  upgradeShaft,
  upgradeWarehouse,
  type MineState,
  type Pinch,
} from "@/game/sim";

const MINER_FRAMES = [
  "/art/miner/attack-1.png",
  "/art/miner/attack-2.png",
  "/art/miner/attack-3.png",
  "/art/miner/attack-4.png",
];
const ORE_SRC: Record<MineState["shafts"][number]["id"], string> = {
  coal: "/art/ores/coal.png",
  iron: "/art/ores/iron.png",
  gold: "/art/ores/gold.png",
  mithril: "/art/ores/mithril.png",
};

const GALLERY_Y = [0.42, 0.56, 0.7, 0.86];

type Floater = { x: number; y: number; text: string; life: number };
type Spark = { x: number; y: number; vx: number; vy: number; life: number; gold: boolean };

type Art = {
  bg: HTMLImageElement | null;
  cart: HTMLImageElement | null;
  miner: HTMLImageElement[];
  ores: Partial<Record<MineState["shafts"][number]["id"], HTMLImageElement>>;
};

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(src));
    img.src = src;
  });
}

function pinchLabel(pinch: Pinch) {
  if (pinch === "shafts") return "Shafts are the pinch";
  if (pinch === "elevator") return "The elevator is the pinch";
  return "The warehouse is the pinch";
}

export function DwarvenMiner() {
  const [phase, setPhase] = useState<"gate" | "mine">("gate");
  const [returning, setReturning] = useState(false);
  const [hudTick, setHudTick] = useState(0);
  const [offline, setOffline] = useState<{ earned: number; seconds: number; capped: boolean } | null>(
    null,
  );
  const [confirmReset, setConfirmReset] = useState(false);
  const [shakeOn, setShakeOn] = useState(true);
  const mine = useRef<MineState>(freshMine());
  const boost = useRef(0);
  const holding = useRef(false);
  const swingCd = useRef(0);
  const trauma = useRef(0);
  const floaters = useRef<Floater[]>([]);
  const sparks = useRef<Spark[]>([]);
  const art = useRef<Art>({ bg: null, cart: null, miner: [], ores: {} });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useRef(false);
  const swingNow = useRef<() => void>(() => {});

  swingNow.current = () => {
    if (swingCd.current > 0) return;
    const live = mine.current;
    const lump = swing(live);
    swingCd.current = 0.34;
    boost.current = 5;
    trauma.current = Math.min(1, trauma.current + 0.18);
    const depth = deepestUnlocked(live);
    floaters.current.push({
      x: 0.62,
      y: GALLERY_Y[depth] - 0.08,
      text: `+${formatNumber(lump)}`,
      life: 0.9,
    });
    burst(sparks.current, 0.58, GALLERY_Y[depth] - 0.05);
    playSwing();
  };

  useEffect(() => {
    const saved = loadMine();
    mine.current = saved;
    setReturning(saved.totalEarned > 0 || saved.cash > 0 || saved.swings > 0);
    setMuted(saved.muted);
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced.current) setShakeOn(false);
  }, []);

  useEffect(() => {
    let cancel = false;
    void (async () => {
      try {
        const [bg, cart, ...frames] = await Promise.all([
          loadImage("/art/mine-bg.jpg"),
          loadImage("/art/cart.png"),
          ...MINER_FRAMES.map(loadImage),
        ]);
        const oreEntries = await Promise.all(
          (Object.keys(ORE_SRC) as Array<keyof typeof ORE_SRC>).map(async (id) => {
            const img = await loadImage(ORE_SRC[id]);
            return [id, img] as const;
          }),
        );
        if (cancel) return;
        art.current = {
          bg,
          cart,
          miner: frames,
          ores: Object.fromEntries(oreEntries),
        };
      } catch {
        /* canvas still paints a timber fallback */
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    if (phase !== "mine") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();
    let uiAcc = 0;
    let saveAcc = 0;
    let clock = 0;
    const fixed = 1 / 30;
    let acc = 0;

    const fit = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
    };
    fit();
    const observer = new ResizeObserver(fit);
    if (canvas.parentElement) observer.observe(canvas.parentElement);

    const onVis = () => {
      if (document.visibilityState === "hidden") {
        mine.current.lastSaveTime = Date.now();
        saveMine(mine.current);
        return;
      }
      resumeAudio();
      const report = applyOffline(mine.current);
      if (report.earned > 0.5) setOffline(report);
    };
    const onPageHide = () => {
      mine.current.lastSaveTime = Date.now();
      saveMine(mine.current);
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", onPageHide);
    const stopHold = () => {
      holding.current = false;
    };
    window.addEventListener("pointerup", stopHold);
    window.addEventListener("pointercancel", stopHold);

    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      acc += dt;
      const present = document.visibilityState === "visible";
      while (acc >= fixed) {
        const state = mine.current;
        boost.current = Math.max(0, boost.current - fixed);
        swingCd.current = Math.max(0, swingCd.current - fixed);
        if (holding.current && present && swingCd.current <= 0) swingNow.current();
        if (present) {
          tick(state, fixed, true, boost.current > 0);
          state.lastSaveTime = Date.now();
        }
        acc -= fixed;
      }
      clock += dt;
      trauma.current = Math.max(0, trauma.current - dt * 1.6);
      floaters.current.forEach((f) => {
        f.life -= dt;
        f.y -= dt * 0.05;
      });
      floaters.current = floaters.current.filter((f) => f.life > 0);
      sparks.current.forEach((s) => {
        s.life -= dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vy += dt * 0.35;
      });
      sparks.current = sparks.current.filter((s) => s.life > 0);

      paint(ctx, canvas, mine.current, art.current, clock, boost.current, trauma.current, shakeOn && !reduced.current, floaters.current, sparks.current);

      uiAcc += dt;
      if (uiAcc > 0.12) {
        uiAcc = 0;
        setHudTick((n) => n + 1);
      }
      saveAcc += dt;
      if (saveAcc > 5) {
        saveAcc = 0;
        saveMine(mine.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pointerup", stopHold);
      window.removeEventListener("pointercancel", stopHold);
      saveMine(mine.current);
    };
  }, [phase, shakeOn]);

  const state = mine.current;
  const view = rates(state);
  const crewed = fullyCrewed(state);
  const upcoming = nextManager(state);
  void hudTick;

  const descend = () => {
    unlockAudio();
    const report = applyOffline(mine.current);
    setPhase("mine");
    if (report.earned > 0.5) setOffline(report);
  };

  const tryAction = (ok: boolean, kind: "upgrade" | "hire") => {
    unlockAudio();
    if (!ok) {
      playDeny();
      return;
    }
    trauma.current = Math.min(1, trauma.current + (kind === "hire" ? 0.45 : 0.28));
    if (kind === "hire") playHire();
    else playUpgrade();
    saveMine(mine.current);
    setHudTick((n) => n + 1);
  };

  return (
    <main className="min-h-dvh bg-bg text-fg">
      {phase === "gate" ? (
        <section className="mx-auto flex min-h-dvh max-w-lg flex-col justify-end gap-6 px-5 py-10">
          <img
            src="/art/mine-bg.jpg"
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-70"
          />
          <div className="absolute inset-0 bg-linear-to-t from-bg via-bg/80 to-bg/20" />
          <div className="relative motion-pop flex flex-col gap-4">
            <p className="text-sm tracking-widest text-gold uppercase">The deep works</p>
            <h1 className="font-display text-5xl leading-none text-fg">Dwarven Miner</h1>
            <p className="max-w-md text-base leading-relaxed text-muted">
              Four veins, one cage, one warehouse. You swing the pick until a crew can run the
              shaft without you. The slowest station sets the pay.
            </p>
            <button
              type="button"
              onClick={descend}
              className="min-h-12 rounded-2xl bg-gold px-5 text-base font-semibold text-bg"
            >
              {returning ? "Return to the vein" : "Descend"}
            </button>
          </div>
        </section>
      ) : (
        <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col lg:flex-row">
          <section className="relative h-80 shrink-0 bg-bg sm:h-96 lg:h-dvh lg:min-h-dvh lg:flex-1">
            <canvas
              ref={canvasRef}
              className="h-full w-full touch-none"
              aria-label="The mine. Hold or tap to swing the pick."
              onPointerDown={(event) => {
                holding.current = true;
                event.currentTarget.setPointerCapture(event.pointerId);
                unlockAudio();
                swingNow.current();
              }}
              onPointerUp={() => {
                holding.current = false;
              }}
              onPointerCancel={() => {
                holding.current = false;
              }}
            />
            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 bg-linear-to-b from-bg/90 to-transparent p-4">
              <div>
                <p className="text-xs tracking-widest text-muted uppercase">Coin</p>
                <p className="font-display text-3xl text-gold">{formatNumber(state.cash)}</p>
                <p className="text-sm text-fg">
                  {formatNumber(view.rate)}
                  <span className="text-muted">/s</span>
                  {boost.current > 0 ? <span className="text-ember"> · double swing</span> : null}
                </p>
              </div>
              <p className="max-w-36 rounded-full bg-surface px-3 py-1 text-center text-xs leading-snug text-fg">
                {pinchLabel(view.pinch)}
              </p>
            </div>
            <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-sm text-fg">
              {state.swings === 0 ? "Hold the rock to swing" : crewed ? "The crew keeps the lamps lit" : "You are the unpaid shift"}
            </p>
          </section>

          <aside className="flex flex-col gap-4 bg-surface p-4 lg:h-dvh lg:w-96 lg:overflow-y-auto">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-2xl">The works</h2>
              <button
                type="button"
                aria-label={state.muted ? "Unmute" : "Mute"}
                className="grid h-11 w-11 place-items-center rounded-full border border-line text-fg"
                onClick={() => {
                  mine.current.muted = !mine.current.muted;
                  setMuted(mine.current.muted);
                  unlockAudio();
                  saveMine(mine.current);
                  setHudTick((n) => n + 1);
                }}
              >
                {state.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <Meter label="Shafts" value={view.parts.shafts} max={Math.max(view.parts.shafts, view.parts.elevator, view.parts.warehouse)} hot={view.pinch === "shafts"} />
              <Meter label="Elevator" value={view.parts.elevator} max={Math.max(view.parts.shafts, view.parts.elevator, view.parts.warehouse)} hot={view.pinch === "elevator"} />
              <Meter label="Warehouse" value={view.parts.warehouse} max={Math.max(view.parts.shafts, view.parts.elevator, view.parts.warehouse)} hot={view.pinch === "warehouse"} />
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              {(["shafts", "elevator", "warehouse"] as const).map((key) => (
                <span
                  key={key}
                  className={
                    state.managers[key]
                      ? "rounded-full bg-bg px-2 py-1 text-gold"
                      : "rounded-full bg-bg px-2 py-1 text-muted"
                  }
                >
                  {MANAGER_TITLES[key]}
                  {state.managers[key] ? " hired" : " open"}
                </span>
              ))}
            </div>

            <p className="text-sm leading-relaxed text-muted">
              {crewed
                ? "All three stations are hired. The mine keeps paying for up to eight hours away."
                : "Unhired stations only pay while this page is open. Hire the full crew to earn offline."}
            </p>

            <div className="flex flex-col gap-2">
              {state.shafts.map((shaft, index) => {
                const cost = shaftUpgradeCost(shaft.level);
                const locked = !shaft.unlocked;
                const afford = !locked && state.cash >= cost;
                return (
                  <button
                    key={shaft.id}
                    type="button"
                    disabled={locked || !afford}
                    onClick={() => tryAction(upgradeShaft(state, index), "upgrade")}
                    className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-line bg-bg px-3 py-2 text-left disabled:opacity-50"
                  >
                    <span>
                      <span className="block font-semibold">{shaft.name}</span>
                      <span className="block text-sm text-muted">
                        {locked
                          ? "Sealed until the vein above reaches 5"
                          : `Level ${shaft.level} · ${formatNumber(shaftRate(shaft))}/s`}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-gold">
                      {locked ? "Locked" : formatNumber(cost)}
                    </span>
                  </button>
                );
              })}
              <StationButton
                icon={<Hammer size={18} />}
                title={`Elevator · Lv ${state.elevatorLevel}`}
                detail={`${formatNumber(view.parts.elevator)}/s haul`}
                cost={stationUpgradeCost(state.elevatorLevel)}
                afford={state.cash >= stationUpgradeCost(state.elevatorLevel)}
                onClick={() => tryAction(upgradeElevator(state), "upgrade")}
              />
              <StationButton
                icon={<Warehouse size={18} />}
                title={`Warehouse · Lv ${state.warehouseLevel}`}
                detail={`${formatNumber(view.parts.warehouse)}/s sold`}
                cost={stationUpgradeCost(state.warehouseLevel)}
                afford={state.cash >= stationUpgradeCost(state.warehouseLevel)}
                onClick={() => tryAction(upgradeWarehouse(state), "upgrade")}
              />
              <button
                type="button"
                disabled={!canHire(state)}
                onClick={() => tryAction(hireManager(state), "hire")}
                className="flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-ember px-3 py-2 text-left text-fg disabled:opacity-50"
              >
                <span>
                  <span className="block font-semibold">
                    {upcoming ? MANAGER_TITLES[upcoming] : "Crew complete"}
                  </span>
                  <span className="block text-sm text-fg/80">
                    {!upcoming
                      ? "Shafts, cage, and warehouse run themselves"
                      : upcoming === "shafts" && state.shafts[0].level < 5
                        ? "Needs Coal Vein level 5"
                        : "Hire to cover this station"}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-semibold">
                  {upcoming ? formatNumber(MANAGER_COSTS[upcoming]) : "Hired"}
                </span>
              </button>
            </div>

            <div className="mt-auto flex items-center justify-between gap-3 pt-2 text-sm text-muted">
              <span>{state.swings} swings</span>
              {confirmReset ? (
                <span className="flex gap-2">
                  <button
                    type="button"
                    className="min-h-11 rounded-full bg-ember px-3 text-fg"
                    onClick={() => {
                      clearMine();
                      mine.current = freshMine();
                      boost.current = 0;
                      holding.current = false;
                      swingCd.current = 0;
                      trauma.current = 0;
                      floaters.current = [];
                      sparks.current = [];
                      setMuted(false);
                      setConfirmReset(false);
                      setOffline(null);
                      setHudTick((n) => n + 1);
                    }}
                  >
                    Abandon vein
                  </button>
                  <button type="button" className="min-h-11 px-3" onClick={() => setConfirmReset(false)}>
                    Keep
                  </button>
                </span>
              ) : (
                <button type="button" className="min-h-11 px-2" onClick={() => setConfirmReset(true)}>
                  Abandon vein
                </button>
              )}
            </div>
          </aside>
        </div>
      )}

      {offline ? (
        <div className="fixed inset-x-4 bottom-4 z-20 mx-auto max-w-md rounded-2xl border border-line bg-surface p-4 shadow-lg">
          <p className="font-display text-xl text-gold">The crew kept digging</p>
          <p className="mt-1 text-sm text-muted">
            {formatDuration(offline.seconds)} away
            {offline.capped ? " (capped at 8 hours)" : ""} · +{formatNumber(offline.earned)} coin
          </p>
          <button
            type="button"
            className="mt-3 min-h-11 rounded-full bg-gold px-4 font-semibold text-bg"
            onClick={() => setOffline(null)}
          >
            Pocket it
          </button>
        </div>
      ) : null}
    </main>
  );
}

function canHire(state: MineState) {
  const key = nextManager(state);
  if (!key) return false;
  if (key === "shafts" && state.shafts[0].level < 5) return false;
  return state.cash >= MANAGER_COSTS[key];
}

function deepestUnlocked(state: MineState) {
  let index = 0;
  state.shafts.forEach((shaft, i) => {
    if (shaft.unlocked) index = i;
  });
  return index;
}

function burst(list: Spark[], x: number, y: number) {
  for (let i = 0; i < 8; i += 1) {
    const angle = -Math.PI * 0.15 - Math.random() * Math.PI * 0.7;
    const speed = 0.15 + Math.random() * 0.25;
    list.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.45 + Math.random() * 0.25,
      gold: Math.random() > 0.45,
    });
  }
}

function StationButton({
  icon,
  title,
  detail,
  cost,
  afford,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  detail: string;
  cost: number;
  afford: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={!afford}
      onClick={onClick}
      className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-line bg-bg px-3 py-2 text-left disabled:opacity-50"
    >
      <span className="flex items-center gap-3">
        <span className="text-gold">{icon}</span>
        <span>
          <span className="block font-semibold">{title}</span>
          <span className="block text-sm text-muted">{detail}</span>
        </span>
      </span>
      <span className="shrink-0 text-sm font-semibold text-gold">{formatNumber(cost)}</span>
    </button>
  );
}

function Meter({ label, value, max, hot }: { label: string; value: number; max: number; hot: boolean }) {
  const pct = max > 0 ? Math.max(6, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-muted">
        <span>{label}</span>
        <span>{formatNumber(value)}/s</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-bg">
        <div className={hot ? "h-full bg-ember" : "h-full bg-gold"} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function paint(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  state: MineState,
  images: Art,
  clock: number,
  boostLeft: number,
  trauma: number,
  allowShake: boolean,
  floaters: Floater[],
  motes: Spark[],
) {
  const w = canvas.width;
  const h = canvas.height;
  const shake = allowShake ? trauma * trauma : 0;
  const ox = Math.sin(clock * 40) * shake * w * 0.012;
  const oy = Math.cos(clock * 33) * shake * h * 0.008;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#140e0a";
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.translate(ox, oy);
  let frameX = 0;
  let frameY = 0;
  let frameW = w;
  let frameH = h;
  if (images.bg) {
    const scale = Math.min(w / images.bg.width, h / images.bg.height);
    frameW = images.bg.width * scale;
    frameH = images.bg.height * scale;
    frameX = (w - frameW) / 2;
    frameY = (h - frameH) / 2;
    ctx.drawImage(images.bg, frameX, frameY, frameW, frameH);
  }
  const px = (nx: number) => frameX + nx * frameW;
  const py = (ny: number) => frameY + ny * frameH;
  const depth = deepestUnlocked(state);
  const elev = rates(state).parts.elevator;
  const speed = 1 + elev / 50;
  const travel = (Math.sin(clock * speed * 1.4) + 1) / 2;
  const cartY = py(0.16 + travel * (GALLERY_Y[depth] - 0.16));
  if (images.cart) {
    const ch = frameH * 0.07;
    const cw = ch * (images.cart.width / images.cart.height);
    ctx.drawImage(images.cart, px(0.22) - cw / 2, cartY - ch / 2, cw, ch);
  }
  state.shafts.forEach((shaft, index) => {
    if (!shaft.unlocked) return;
    const ore = images.ores[shaft.id];
    if (!ore) return;
    const oh = frameH * 0.055;
    const ow = oh * (ore.width / ore.height);
    ctx.globalAlpha = 0.95;
    ctx.drawImage(ore, px(0.78) - ow / 2, py(GALLERY_Y[index]) - oh, ow, oh);
    ctx.globalAlpha = 1;
  });
  const frames = images.miner;
  if (frames.length === 4) {
    const fps = boostLeft > 0 ? 10 : 6;
    const frame = frames[Math.floor(clock * fps) % 4];
    const mh = frameH * 0.15;
    const mw = mh * (frame.width / frame.height);
    const bob = allowShake ? Math.sin(clock * 4) * frameH * 0.004 : 0;
    const feet = py(GALLERY_Y[depth]) + bob;
    ctx.drawImage(frame, px(0.56) - mw / 2, feet - mh, mw, mh);
  } else {
    ctx.fillStyle = "#e6a23c";
    ctx.fillRect(px(0.5), py(GALLERY_Y[depth]) - frameH * 0.12, frameW * 0.08, frameH * 0.12);
  }
  motes.forEach((spark) => {
    ctx.globalAlpha = Math.max(0, spark.life * 2);
    ctx.fillStyle = spark.gold ? "#e6a23c" : "#f3e4c4";
    const size = Math.max(2, frameW * 0.012);
    ctx.fillRect(px(spark.x), py(spark.y), size, size);
  });
  ctx.globalAlpha = 1;
  ctx.font = `${Math.max(14, Math.floor(frameH * 0.032))}px Fraunces, Georgia, serif`;
  ctx.textAlign = "center";
  floaters.forEach((floater) => {
    ctx.globalAlpha = Math.max(0, floater.life);
    ctx.fillStyle = "#e6a23c";
    ctx.fillText(floater.text, px(floater.x), py(floater.y));
  });
  ctx.restore();
  ctx.globalAlpha = 1;
}
