import { freshMine, SAVE_VERSION, type MineState, type Shaft } from "./sim";

const KEY = "dwarven-miner.save";
const BACKUP = "dwarven-miner.save.bak";

function isShaft(value: unknown): value is Shaft {
  if (!value || typeof value !== "object") return false;
  const shaft = value as Shaft;
  return (
    typeof shaft.id === "string" &&
    typeof shaft.name === "string" &&
    typeof shaft.level === "number" &&
    typeof shaft.baseRate === "number" &&
    typeof shaft.unlocked === "boolean"
  );
}

export function normalize(raw: unknown): MineState {
  const base = freshMine();
  if (!raw || typeof raw !== "object") return base;
  const data = raw as Partial<MineState>;
  const shafts = Array.isArray(data.shafts) ? data.shafts.filter(isShaft) : [];
  const mergedShafts = base.shafts.map((shaft) => {
    const found = shafts.find((item) => item.id === shaft.id);
    return found ? { ...shaft, ...found, id: shaft.id, name: shaft.name, baseRate: shaft.baseRate } : shaft;
  });
  return {
    ...base,
    ...data,
    version: SAVE_VERSION,
    cash: Number.isFinite(data.cash) ? Math.max(0, data.cash as number) : 0,
    elevatorLevel: Math.max(1, Math.floor(data.elevatorLevel ?? 1)),
    warehouseLevel: Math.max(1, Math.floor(data.warehouseLevel ?? 1)),
    shafts: mergedShafts,
    managers: {
      shafts: Boolean(data.managers?.shafts),
      elevator: Boolean(data.managers?.elevator),
      warehouse: Boolean(data.managers?.warehouse),
    },
    lastSaveTime: Number.isFinite(data.lastSaveTime) ? (data.lastSaveTime as number) : Date.now(),
    totalEarned: Number.isFinite(data.totalEarned) ? Math.max(0, data.totalEarned as number) : 0,
    swings: Number.isFinite(data.swings) ? Math.max(0, data.swings as number) : 0,
    muted: Boolean(data.muted),
  };
}

export function loadMine(): MineState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return freshMine();
    return normalize(JSON.parse(raw));
  } catch {
    try {
      const backup = localStorage.getItem(BACKUP);
      if (backup) return normalize(JSON.parse(backup));
    } catch {
      /* fall through */
    }
    return freshMine();
  }
}

export function saveMine(state: MineState) {
  try {
    const previous = localStorage.getItem(KEY);
    if (previous) localStorage.setItem(BACKUP, previous);
    localStorage.setItem(KEY, JSON.stringify({ ...state, version: SAVE_VERSION }));
  } catch {
    /* private mode / quota — keep playing in memory */
  }
}

export function clearMine() {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(BACKUP);
  } catch {
    /* ignore */
  }
}
