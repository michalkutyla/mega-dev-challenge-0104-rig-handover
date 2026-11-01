import type { ReadNight, RunStatus } from './types.js';

export type NightLink = { night: string; counts: Record<RunStatus, number> | null };

export function nightLinks(runsDir: string, nights: string[], read: ReadNight): NightLink[] {
  return nights.map((night) => ({ night, counts: read(runsDir, night)?.counts ?? null }));
}
