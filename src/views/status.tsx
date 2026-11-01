import type { NightLink } from '../digest/board.js';
import type { Status } from '../status.js';

export function StatusBoard({ status, links }: { status: Status; links: NightLink[] }) {
  return (
    <>
      <h1>status</h1>
      <table>
        <tbody>
          <tr><th>adapter</th><td>{status.adapter}</td></tr>
          <tr><th>installed</th><td>{status.installed}</td></tr>
          <tr>
            <th>last beat</th>
            <td>{status.lastBeat ? `${status.lastBeat.at} · pid ${status.lastBeat.pid}` : <span class="warn">none</span>}</td>
          </tr>
        </tbody>
      </table>
      <h2>nights on disk</h2>
      {status.nights.length === 0 ? (
        <p class="mute">nothing in runs/</p>
      ) : (
        <ul>
          {links.map((l) => (
            <li>
              <a href={`/digest/${l.night}`}>{l.night}</a>{' '}
              {l.counts ? (
                <span class="mute">
                  ok {l.counts.ok} · retry {l.counts.retry} ·{' '}
                  <span class={l.counts.fail > 0 ? 'warn' : undefined}>fail {l.counts.fail}</span>
                </span>
              ) : (
                <span class="mute">—</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
