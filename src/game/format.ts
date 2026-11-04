const UNITS = ["", "K", "M", "B", "T", "Qa"];

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "0";
  const sign = value < 0 ? "-" : "";
  let n = Math.abs(value);
  if (n < 1000) {
    return sign + (n < 100 ? n.toFixed(1) : Math.floor(n).toString());
  }
  let i = 0;
  while (n >= 1000 && i < UNITS.length - 1) {
    n /= 1000;
    i += 1;
  }
  return `${sign}${n.toFixed(n >= 100 ? 0 : 1)}${UNITS[i]}`;
}

export function formatDuration(seconds: number): string {
  const s = Math.floor(seconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}h ${rem}m` : `${h}h`;
}
