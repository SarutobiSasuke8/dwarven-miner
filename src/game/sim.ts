export const SAVE_VERSION = 1;
export const OFFLINE_CAP_SEC = 8 * 60 * 60;

export type ManagerKey = "shafts" | "elevator" | "warehouse";

export type Shaft = {
  id: "coal" | "iron" | "gold" | "mithril";
  name: string;
  level: number;
  baseRate: number;
  unlocked: boolean;
};

export type MineState = {
  version: number;
  cash: number;
  elevatorLevel: number;
  warehouseLevel: number;
  shafts: Shaft[];
  managers: Record<ManagerKey, boolean>;
  lastSaveTime: number;
  totalEarned: number;
  swings: number;
  muted: boolean;
};

export const MANAGER_ORDER: ManagerKey[] = ["shafts", "elevator", "warehouse"];

export const MANAGER_COSTS: Record<ManagerKey, number> = {
  shafts: 100,
  elevator: 250,
  warehouse: 600,
};

export const MANAGER_TITLES: Record<ManagerKey, string> = {
  shafts: "Shaft foreman",
  elevator: "Elevator hand",
  warehouse: "Warehouse clerk",
};

export function freshMine(now = Date.now()): MineState {
  return {
    version: SAVE_VERSION,
    cash: 0,
    elevatorLevel: 1,
    warehouseLevel: 1,
    shafts: [
      { id: "coal", name: "Coal Vein", level: 1, baseRate: 1, unlocked: true },
      { id: "iron", name: "Iron Deep", level: 0, baseRate: 5, unlocked: false },
      { id: "gold", name: "Gold Hall", level: 0, baseRate: 25, unlocked: false },
      { id: "mithril", name: "Mithril Cavern", level: 0, baseRate: 120, unlocked: false },
    ],
    managers: { shafts: false, elevator: false, warehouse: false },
    lastSaveTime: now,
    totalEarned: 0,
    swings: 0,
    muted: false,
  };
}

export function shaftRate(shaft: Shaft): number {
  if (!shaft.unlocked || shaft.level <= 0) return 0;
  return shaft.baseRate * 1.15 ** (shaft.level - 1);
}

export function elevatorRate(level: number): number {
  return 10 * 1.12 ** (level - 1);
}

export function warehouseRate(level: number): number {
  return 10 * 1.12 ** (level - 1);
}

export function totalShaftRate(state: MineState): number {
  return state.shafts.reduce((sum, shaft) => sum + shaftRate(shaft), 0);
}

export type Pinch = "shafts" | "elevator" | "warehouse";

export function rates(state: MineState) {
  const parts = {
    shafts: totalShaftRate(state),
    elevator: elevatorRate(state.elevatorLevel),
    warehouse: warehouseRate(state.warehouseLevel),
  };
  const pinch = (Object.keys(parts) as Pinch[]).reduce((best, key) =>
    parts[key] < parts[best] ? key : best,
  );
  return { parts, pinch, rate: parts[pinch] };
}

export function shaftUpgradeCost(level: number): number {
  return 10 * 1.25 ** level;
}

export function stationUpgradeCost(level: number): number {
  return 50 * 1.3 ** level;
}

export function fullyCrewed(state: MineState): boolean {
  return state.managers.shafts && state.managers.elevator && state.managers.warehouse;
}

export function nextManager(state: MineState): ManagerKey | null {
  return MANAGER_ORDER.find((key) => !state.managers[key]) ?? null;
}

function credit(state: MineState, amount: number) {
  if (amount <= 0) return;
  state.cash += amount;
  state.totalEarned += amount;
}

export function upgradeShaft(state: MineState, index: number): boolean {
  const shaft = state.shafts[index];
  if (!shaft?.unlocked) return false;
  const cost = shaftUpgradeCost(shaft.level);
  if (state.cash < cost) return false;
  state.cash -= cost;
  shaft.level += 1;
  const next = state.shafts[index + 1];
  if (shaft.level >= 5 && next && !next.unlocked) {
    next.unlocked = true;
    next.level = 1;
  }
  return true;
}

export function upgradeElevator(state: MineState): boolean {
  const cost = stationUpgradeCost(state.elevatorLevel);
  if (state.cash < cost) return false;
  state.cash -= cost;
  state.elevatorLevel += 1;
  return true;
}

export function upgradeWarehouse(state: MineState): boolean {
  const cost = stationUpgradeCost(state.warehouseLevel);
  if (state.cash < cost) return false;
  state.cash -= cost;
  state.warehouseLevel += 1;
  return true;
}

export function hireManager(state: MineState): boolean {
  const key = nextManager(state);
  if (!key) return false;
  if (key === "shafts" && state.shafts[0].level < 5) return false;
  const cost = MANAGER_COSTS[key];
  if (state.cash < cost) return false;
  state.cash -= cost;
  state.managers[key] = true;
  return true;
}

export function swing(state: MineState): number {
  const lump = rates(state).rate;
  credit(state, lump);
  state.swings += 1;
  return lump;
}

/** Player covers any station that has no manager, so the vein pays while you watch. */
export function tick(state: MineState, dt: number, present: boolean, boost: boolean) {
  if (dt <= 0) return 0;
  if (!present && !fullyCrewed(state)) return 0;
  const amount = rates(state).rate * dt * (boost ? 2 : 1);
  credit(state, amount);
  return amount;
}

export function applyOffline(state: MineState, now = Date.now()) {
  const elapsed = Math.max(0, (now - state.lastSaveTime) / 1000);
  const seconds = Math.min(elapsed, OFFLINE_CAP_SEC);
  let earned = 0;
  if (fullyCrewed(state) && seconds > 2) {
    earned = rates(state).rate * seconds;
    credit(state, earned);
  }
  state.lastSaveTime = now;
  return { seconds, earned, capped: elapsed > OFFLINE_CAP_SEC };
}
