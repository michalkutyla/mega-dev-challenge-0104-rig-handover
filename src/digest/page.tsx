import type { Hono } from 'hono';
import { lane } from '../lane.js';
import { DigestPage } from '../views/digest.js';
import { Layout } from '../views/layout.js';
import type { ReadNight } from './types.js';

export function digestPage(app: Hono, runsDir: string, read: ReadNight) {
  app.get('/digest/:night', (c) => {
    const night = c.req.param('night');
    const n = read(runsDir, night);
    if (!n) return c.notFound();
    return c.html(
      <Layout title={`digest ${night}`} lane={lane()}>
        <DigestPage night={n} />
      </Layout>,
    );
  });
}
