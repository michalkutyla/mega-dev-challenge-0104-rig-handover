// Plan morning-digest § 1. The contract every part of § 2 starts against.

export type RunStatus = 'ok' | 'retry' | 'fail';

// One line of runs/<night>.jsonl.
export type RunLine = {
  at: string;
  job: string;
  status: RunStatus;
  owner: string | null;
  error?: string;
};

// One job's night. Times keep the offset from the log (styleguide).
export type DigestRow = {
  job: string;
  owner: string | null; // null renders as "—"
  runs: number; // lines for this job
  retries: number; // lines with status "retry"
  lastStatus: RunStatus;
  lastError: string | null; // error of the last line that had one; null renders as "—"
  first: string; // `at` of the first line
  last: string; // `at` of the last line
};

export type Night = {
  night: string; // YYYY-MM-DD, the file name
  rows: DigestRow[]; // sorted by job
  counts: Record<RunStatus, number>; // lines per status, for the board link (§ 2c)
  badLines: number; // lines that didn't parse; counted, never thrown
};

// Reads runsDir/<night>.jsonl. Returns null when the night has no file (→ 404).
// An empty file returns { rows: [], counts: all 0, badLines: 0 } (→ "nothing ran").
export type ReadNight = (runsDir: string, night: string) => Night | null;
