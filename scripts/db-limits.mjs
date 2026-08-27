/**
 * Reports the database's resource limits, current usage and storage size.
 *   npm run db:limits
 *
 * Useful on shared hosting (Hostinger, cPanel…) where the per-account
 * MAX_CONNECTIONS_PER_HOUR quota is usually the first thing you hit.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const row = (label, value, note = '') =>
  `  ${label.padEnd(28)} ${String(value).padEnd(14)} ${note}`;

function parseGrant(grant) {
  const num = (re) => {
    const m = grant.match(re);
    return m ? Number(m[1]) : null;
  };
  return {
    maxUserConnections: num(/MAX_USER_CONNECTIONS (\d+)/),
    maxConnectionsPerHour: num(/MAX_CONNECTIONS_PER_HOUR (\d+)/),
    maxQueriesPerHour: num(/MAX_QUERIES_PER_HOUR (\d+)/),
    maxUpdatesPerHour: num(/MAX_UPDATES_PER_HOUR (\d+)/),
    maxStatementTime: num(/MAX_STATEMENT_TIME (\d+)/),
  };
}

try {
  const url = process.env.DATABASE_URL ?? '';
  const host = url.match(/@([^/:]+)/)?.[1] ?? 'unknown';
  const dbName = url.match(/\/([^/?]+)(\?|$)/)?.[1] ?? 'unknown';
  const poolLimit = url.match(/connection_limit=(\d+)/)?.[1] ?? '(Prisma default: cpus × 2 + 1)';

  console.log(`\nDatabase: ${dbName} @ ${host}\n`);

  // ---------------------------------------------------------------- grants
  const grants = await prisma.$queryRawUnsafe('SHOW GRANTS FOR CURRENT_USER()');
  const grantText = grants.map((g) => Object.values(g)[0]).join('\n');
  const limits = parseGrant(grantText);

  console.log('Account limits');
  console.log(
    row(
      'Concurrent connections',
      limits.maxUserConnections ?? 'unlimited',
      'how many can be open at once'
    )
  );
  console.log(
    row(
      'New connections / hour',
      limits.maxConnectionsPerHour ?? 'unlimited',
      limits.maxConnectionsPerHour ? '<- usually the binding limit' : ''
    )
  );
  if (limits.maxQueriesPerHour) console.log(row('Queries / hour', limits.maxQueriesPerHour));
  if (limits.maxUpdatesPerHour) console.log(row('Updates / hour', limits.maxUpdatesPerHour));
  if (limits.maxStatementTime)
    console.log(row('Max statement time', `${limits.maxStatementTime}s`, 'long queries are killed'));

  // ---------------------------------------------------------------- server
  const vars = await prisma.$queryRawUnsafe(
    `SHOW VARIABLES WHERE Variable_name IN
     ('max_connections','wait_timeout','interactive_timeout','max_allowed_packet','version')`
  );
  const v = Object.fromEntries(vars.map((x) => [x.Variable_name, x.Value]));

  console.log('\nServer');
  console.log(row('Version', v.version ?? '?'));
  console.log(row('Server max_connections', v.max_connections ?? '?', 'shared across all accounts'));
  console.log(
    row('Idle timeout', `${v.wait_timeout ?? '?'}s`, 'idle pooled connections are dropped')
  );
  console.log(
    row('Max packet', `${Math.round(Number(v.max_allowed_packet ?? 0) / 1024 / 1024)} MB`)
  );

  // ---------------------------------------------------------------- usage
  const status = await prisma.$queryRawUnsafe(
    `SHOW STATUS WHERE Variable_name IN
     ('Threads_connected','Threads_running','Max_used_connections','Uptime')`
  );
  const s = Object.fromEntries(status.map((x) => [x.Variable_name, x.Value]));

  console.log('\nRight now');
  console.log(row('Open connections (server)', s.Threads_connected ?? '?'));
  console.log(row('Running queries', s.Threads_running ?? '?'));

  // ---------------------------------------------------------------- app pool
  console.log('\nThis app');
  console.log(row('Prisma pool size', poolLimit, 'per Node process'));
  if (limits.maxConnectionsPerHour && v.wait_timeout) {
    const pool = Number(poolLimit) || 9;
    const churnPerHour = Math.ceil((3600 / Number(v.wait_timeout)) * pool);
    const pct = Math.round((churnPerHour / limits.maxConnectionsPerHour) * 100);
    console.log(
      row(
        'Worst-case reconnects/hr',
        churnPerHour,
        `~${pct}% of your ${limits.maxConnectionsPerHour}/hr quota (one idle process)`
      )
    );
    if (pct > 60) {
      console.log(
        `\n  ! A single idle process could use ${pct}% of the hourly connection quota.`
      );
      console.log('    Lower connection_limit in DATABASE_URL, or run fewer app instances.');
    }
  }

  // ---------------------------------------------------------------- storage
  const size = await prisma.$queryRawUnsafe(
    `SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS mb,
            COUNT(*) AS tables
     FROM information_schema.tables WHERE table_schema = DATABASE()`
  );
  console.log('\nStorage');
  console.log(row('Database size', `${size[0]?.mb ?? 0} MB`, `${size[0]?.tables ?? 0} tables`));

  // Uploaded files live in the database so they survive a rebuild, which means
  // media is the one table that grows with use. Surface it explicitly.
  const media = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) AS files,
            COALESCE(ROUND(SUM(size) / 1024 / 1024, 2), 0) AS mb
     FROM uploaded_files`
  );
  console.log(
    row(
      'Stored uploads',
      `${media[0]?.files ?? 0} files`,
      `${media[0]?.mb ?? 0} MB — these survive redeploys`
    )
  );

  const biggest = await prisma.$queryRawUnsafe(
    `SELECT table_name AS name,
            ROUND((data_length + index_length) / 1024, 1) AS kb,
            table_rows AS row_count
     FROM information_schema.tables
     WHERE table_schema = DATABASE()
     ORDER BY (data_length + index_length) DESC LIMIT 5`
  );
  console.log('\n  Largest tables');
  for (const t of biggest) {
    console.log(`    ${String(t.name).padEnd(22)} ${String(t.kb + ' KB').padEnd(12)} ~${t.row_count} rows`);
  }

  console.log('');
} catch (err) {
  console.error('\nCould not read database limits:\n', err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
