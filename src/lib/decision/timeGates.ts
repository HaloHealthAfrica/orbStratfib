import { DateTime } from "luxon";

export type SessionGate =
  | { allowed: true; session: "OPEN" | "MID" | "LUNCH" | "POWER" }
  | { allowed: false; reason: "OUTSIDE_RTH" | "LUNCH_BLOCKED" };

function parseHHMM(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return { h, m };
}

export function hardSessionGate(
  nowMs: number,
  cfg: {
    timezone: string;
    rthStart: string;
    rthEnd: string;
    lunchStart: string;
    lunchEnd: string;
    allowOutsideRTH: boolean;
    allowLunch: boolean;
  }
): SessionGate {
  const now = DateTime.fromMillis(nowMs, { zone: cfg.timezone });
  const { h: rthSH, m: rthSM } = parseHHMM(cfg.rthStart);
  const { h: rthEH, m: rthEM } = parseHHMM(cfg.rthEnd);
  const { h: lSH, m: lSM } = parseHHMM(cfg.lunchStart);
  const { h: lEH, m: lEM } = parseHHMM(cfg.lunchEnd);

  const rthStart = now.set({ hour: rthSH, minute: rthSM, second: 0, millisecond: 0 });
  const rthEnd = now.set({ hour: rthEH, minute: rthEM, second: 0, millisecond: 0 });

  const lunchStart = now.set({ hour: lSH, minute: lSM, second: 0, millisecond: 0 });
  const lunchEnd = now.set({ hour: lEH, minute: lEM, second: 0, millisecond: 0 });

  const inRTH = now >= rthStart && now <= rthEnd;
  if (!inRTH && !cfg.allowOutsideRTH) return { allowed: false, reason: "OUTSIDE_RTH" };

  const inLunch = now >= lunchStart && now <= lunchEnd;
  if (inLunch && !cfg.allowLunch) return { allowed: false, reason: "LUNCH_BLOCKED" };

  const minutesFromOpen = now.diff(rthStart, "minutes").minutes;
  const minutesToClose = rthEnd.diff(now, "minutes").minutes;

  if (minutesFromOpen <= 30) return { allowed: true, session: "OPEN" };
  if (minutesToClose <= 60) return { allowed: true, session: "POWER" };
  if (inLunch) return { allowed: true, session: "LUNCH" };
  return { allowed: true, session: "MID" };
}

export function sessionTimeScore(session: "OPEN" | "MID" | "LUNCH" | "POWER") {
  switch (session) {
    case "OPEN":
      return 80;
    case "POWER":
      return 75;
    case "LUNCH":
      return 30;
    case "MID":
    default:
      return 55;
  }
}


