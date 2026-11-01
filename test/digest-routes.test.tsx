import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { DigestRow, RunStatus } from '../src/digest/types.js';

type DigestJson = {
  night: string;
  rows: DigestRow[];
  counts: Record<RunStatus, number>;
  badLines: number;
};

const NORMAL = '2026-10-28';
const EMPTY = '2026-10-27';
const BAD = '2026-10-26';
const MISSING = '2026-10-25';

// Deliberately not sorted by job: the routes must sort.
const normalLines = [
  '{"at":"2026-10-28T23:00:02+01:00","job":"c/job","status":"ok","owner":"x"}',
  '{"at":"2026-10-28T23:00:05+01:00","job":"a/job","status":"retry","owner":null,"error":"timeout"}',
  '{"at":"2026-10-28T23:05:05+01:00","job":"a/job","status":"ok","owner":null}',
  '{"at":"2026-10-28T23:10:00+01:00","job":"b/job","status":"fail","owner":"y","error":"boom"}',
];

const badLines = [
  '{"at":"2026-10-26T23:00:02+01:00","job":"z/job","status":"ok","owner":"x"}',
  'this is not json',
  '{"at":"2026-10-26T23:01:02+01:00","job":"m/job","status":"ok","owner":null}',
];

let runsDir: string;
let app: ReturnType<typeof createApp>;

beforeAll(() => {
  process.env.LANE_MARKER = 'TEST-MARKER';
  runsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rig-digest-'));
  fs.writeFileSync(path.join(runsDir, `${NORMAL}.jsonl`), normalLines.join('\n') + '\n');
  fs.writeFileSync(path.join(runsDir, `${EMPTY}.jsonl`), '');
  fs.writeFileSync(path.join(runsDir, `${BAD}.jsonl`), badLines.join('\n') + '\n');
  app = createApp({
    adapter: 'shim',
    installed: '2026-10-29T14:06:00+01:00',
    beatEverySeconds: 60,
    runsDir,
  });
});

afterAll(() => {
  fs.rmSync(runsDir, { recursive: true, force: true });
});

const json = async (night: string) => {
  const res = await app.request(`/api/digest/${night}`);
  return { res, body: (await res.json()) as DigestJson };
};

const expectInOrder = (html: string, jobs: string[]) => {
  const at = jobs.map((j) => html.indexOf(j));
  expect(at.every((i) => i >= 0)).toBe(true);
  expect(at).toEqual([...at].sort((x, y) => x - y));
};

describe('digest page', () => {
  it('renders a normal night with the banner and jobs sorted', async () => {
    const res = await app.request(`/digest/${NORMAL}`);
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('TEST-MARKER');
    expectInOrder(html, ['a/job', 'b/job', 'c/job']);
  });

  it('404 when the night has no file', async () => {
    const res = await app.request(`/digest/${MISSING}`);
    expect(res.status).toBe(404);
  });

  it('empty night says nothing ran', async () => {
    const res = await app.request(`/digest/${EMPTY}`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('a bad line does not hide the good jobs', async () => {
    const res = await app.request(`/digest/${BAD}`);
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('m/job');
    expect(html).toContain('z/job');
  });
});

describe('digest json', () => {
  it('returns rows, counts and badLines for a normal night', async () => {
    const { res, body } = await json(NORMAL);
    expect(res.status).toBe(200);
    expect(body.night).toBe(NORMAL);
    expect(body.rows.map((r) => r.job)).toEqual(['a/job', 'b/job', 'c/job']);
    expect(body.counts).toEqual({ ok: 2, retry: 1, fail: 1 });
    expect(body.badLines).toBe(0);
    const a = body.rows[0]!;
    expect(a.owner).toBeNull();
    expect(a.runs).toBe(2);
    expect(a.retries).toBe(1);
    expect(a.lastStatus).toBe('ok');
    expect(a.first).toBe('2026-10-28T23:00:05+01:00');
    expect(a.last).toBe('2026-10-28T23:05:05+01:00');
  });

  it('404 when the night has no file', async () => {
    const res = await app.request(`/api/digest/${MISSING}`);
    expect(res.status).toBe(404);
  });

  it('empty night has no rows and no bad lines', async () => {
    const { res, body } = await json(EMPTY);
    expect(res.status).toBe(200);
    expect(body.rows).toEqual([]);
    expect(body.badLines).toBe(0);
  });

  it('counts a bad line and keeps the good rows', async () => {
    const { res, body } = await json(BAD);
    expect(res.status).toBe(200);
    expect(body.badLines).toBe(1);
    expect(body.rows.map((r) => r.job)).toEqual(['m/job', 'z/job']);
  });
});

describe('page and json agree', () => {
  it.each([NORMAL, BAD])('same job order for %s', async (night) => {
    const { body } = await json(night);
    const html = await (await app.request(`/digest/${night}`)).text();
    expectInOrder(html, body.rows.map((r) => r.job));
  });
});
