import { Hono } from 'hono';
import { loadConfig, type RigConfig } from './config.js';
import { digestApi } from './digest/api.js';
import { nightLinks } from './digest/board.js';
import { digestPage } from './digest/page.js';
import { readNight } from './digest/read.js';
import type { ReadNight } from './digest/types.js';
import { lane } from './lane.js';
import { readStatus } from './status.js';
import { Layout } from './views/layout.js';
import { StatusBoard } from './views/status.js';

export function createApp(config: RigConfig = loadConfig(), read: ReadNight = readNight) {
  const app = new Hono();

  app.get('/health', (c) => c.json({ ok: true, lane: lane().id }));

  app.get('/', (c) => {
    const status = readStatus(config);
    return c.html(
      <Layout title="status" lane={lane()}>
        <StatusBoard status={status} links={nightLinks(config.runsDir, status.nights, read)} />
      </Layout>,
    );
  });

  digestPage(app, config.runsDir, read);
  digestApi(app, config.runsDir, read);

  return app;
}
