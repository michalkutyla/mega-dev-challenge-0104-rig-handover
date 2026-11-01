import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/read.js';

const NONE = { ok: 0, retry: 0, fail: 0 };

describe('readNight on runs/2026-10-28.jsonl', () => {
  const night = readNight('runs', '2026-10-28');

  it('gives 5 jobs sorted by job and 1 bad line', () => {
    expect(night).not.toBeNull();
    expect(night?.night).toBe('2026-10-28');
    expect(night?.badLines).toBe(1);
    expect(night?.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
  });

  it('counts valid lines per status', () => {
    expect(night?.counts).toEqual({ ok: 10, retry: 4, fail: 1 });
  });

  it('counts runs and retries, keeps the last status and the last error', () => {
    const row = night?.rows.find((r) => r.job === 'fixtures/refresh');
    expect(row).toEqual({
      job: 'fixtures/refresh',
      owner: 'rook',
      runs: 4,
      retries: 3,
      lastStatus: 'ok',
      lastError: 'upstream 503',
      first: '2026-10-29T01:30:00+01:00',
      last: '2026-10-29T01:37:00+01:00',
    });
  });

  it('keeps a failed job with its error', () => {
    const row = night?.rows.find((r) => r.job === 'notes/backup');
    expect(row?.lastStatus).toBe('fail');
    expect(row?.lastError).toBe('quota exceeded');
  });

  it('keeps a row whose owner is null', () => {
    const row = night?.rows.find((r) => r.job === 'digest/render');
    expect(row?.owner).toBeNull();
    expect(row?.lastError).toBeNull();
  });

  it('keeps times as written, offset included', () => {
    const row = night?.rows.find((r) => r.job === 'rig/rotate-logs');
    expect(row?.first).toBe('2026-10-28T23:00:02+01:00');
    expect(row?.last).toBe('2026-10-28T23:00:02+01:00');
  });
});

describe('readNight on a temp runs dir', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns null for a night with no file', () => {
    expect(readNight(dir, '2026-01-01')).toBeNull();
  });

  it('returns null for a night that is not YYYY-MM-DD', () => {
    writeFileSync(join(dir, 'x.jsonl'), '');
    expect(readNight(dir, 'x')).toBeNull();
    expect(readNight(dir, '../runs/2026-10-28')).toBeNull();
  });

  it('returns no rows for an empty file', () => {
    writeFileSync(join(dir, '2026-01-02.jsonl'), '');
    expect(readNight(dir, '2026-01-02')).toEqual({ night: '2026-01-02', rows: [], counts: NONE, badLines: 0 });
  });

  it('ignores blank lines', () => {
    writeFileSync(join(dir, '2026-01-03.jsonl'), '\n  \n\r\n');
    expect(readNight(dir, '2026-01-03')).toEqual({ night: '2026-01-03', rows: [], counts: NONE, badLines: 0 });
  });

  it('counts bad lines and never throws', () => {
    const lines = [
      '{"at":"2026-01-04T01:00:00+01:00","job":"a","status":"ok","owner":"rook"}',
      'not json',
      '[]',
      'null',
      '{"at":"2026-01-04T01:00:00+01:00","job":"a","status":"done","owner":"rook"}',
      '{"at":"2026-01-04T01:00:00+01:00","job":"a","status":"ok"}',
      '{"at":"2026-01-04T01:00:00+01:00","job":"a","status":"ok","owner":"rook","error":5}',
      '{"job":"a","status":"ok","owner":"rook"}',
      '',
      '{"at":"2026-01-04T02:00:00+01:00","job":"a","status":"retry","owner":null,"error":"boom"}',
    ];
    writeFileSync(join(dir, '2026-01-04.jsonl'), lines.join('\n') + '\n');
    const night = readNight(dir, '2026-01-04');
    expect(night?.badLines).toBe(7);
    expect(night?.counts).toEqual({ ok: 1, retry: 1, fail: 0 });
    expect(night?.rows).toEqual([
      {
        job: 'a',
        owner: null,
        runs: 2,
        retries: 1,
        lastStatus: 'retry',
        lastError: 'boom',
        first: '2026-01-04T01:00:00+01:00',
        last: '2026-01-04T02:00:00+01:00',
      },
    ]);
  });
});
