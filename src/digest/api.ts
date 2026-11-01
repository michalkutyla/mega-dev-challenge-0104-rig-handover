import type { Hono } from 'hono';
import type { ReadNight } from './types.js';

// Plan morning-digest § 2b. Same Night as the page (§ 2c); rows go out as the reader ordered them.
export function digestApi(app: Hono, runsDir: string, read: ReadNight) {
  app.get('/api/digest/:night', (c) => {
    const night = c.req.param('night');
    const n = read(runsDir, night);
    if (n === null) return c.json({ error: 'no such night', night }, 404);
    return c.json(n);
  });
}
