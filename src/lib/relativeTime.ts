const MINUTE = 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;
const MONTH = DAY * 30;
const YEAR = DAY * 365;

/**
 * Short "how long ago" label for record lists ("hace 2h", "hace 5d").
 * Falls back to an absolute date past a year, where the relative form stops
 * carrying useful information.
 */
export const relativeTime = (value?: string | null): string => {
  if (!value) return "—";

  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return "—";

  const seconds = Math.floor((Date.now() - timestamp.getTime()) / 1000);

  // Clock skew between the browser and the database should not read as a date
  // in the future.
  if (seconds < MINUTE) return "ahora";
  if (seconds < HOUR) return `hace ${Math.floor(seconds / MINUTE)}m`;
  if (seconds < DAY) return `hace ${Math.floor(seconds / HOUR)}h`;
  if (seconds < MONTH) return `hace ${Math.floor(seconds / DAY)}d`;
  if (seconds < YEAR) return `hace ${Math.floor(seconds / MONTH)}mes`;

  return timestamp.toLocaleDateString("es-MX");
};

/** Full timestamp for the `title` tooltip beside the relative label. */
export const absoluteTime = (value?: string | null): string => {
  if (!value) return "";
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? "" : timestamp.toLocaleString("es-MX");
};
