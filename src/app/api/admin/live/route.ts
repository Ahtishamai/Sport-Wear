import 'server-only';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { badRequest, json, unauthorized } from '@/lib/api';
import { readLiveSnapshot } from '@/lib/traffic-read';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Who is on the site, and where today's visitors came from.
 *
 * Its own endpoint, and deliberately two queries, because the dashboard
 * polls it. Re-rendering a whole screen every half minute would run the
 * full six against a database that allows five hundred new connections an
 * hour for everything the shop does.
 */
export async function GET() {
  if (!(await getSession())) return unauthorized();
  return json(await readLiveSnapshot());
}

/*
 * The table the traffic screens read.
 *
 * Normally `npm run db:push` makes it, which wants a terminal on the
 * server. On shared hosting that is a support ticket and an SSH key, so
 * the admin can ask for it here instead. It is the one piece of schema the
 * app will create for itself, it adds a table and alters nothing, and
 * running it twice does nothing the second time.
 */
const CREATE_VISITS = `
CREATE TABLE IF NOT EXISTS \`visits\` (
  \`id\` VARCHAR(191) NOT NULL,
  \`visitor\` VARCHAR(44) NOT NULL,
  \`session\` VARCHAR(44) NOT NULL,
  \`path\` VARCHAR(512) NOT NULL,
  \`channel\` VARCHAR(16) NOT NULL,
  \`source\` VARCHAR(96) NOT NULL,
  \`medium\` VARCHAR(48) NULL,
  \`campaign\` VARCHAR(120) NULL,
  \`referrer\` VARCHAR(512) NULL,
  \`device\` VARCHAR(8) NOT NULL,
  \`bot\` BOOLEAN NOT NULL DEFAULT false,
  \`crawler\` VARCHAR(24) NULL,
  \`at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX \`visits_at_idx\`(\`at\`),
  INDEX \`visits_bot_at_idx\`(\`bot\`, \`at\`),
  INDEX \`visits_channel_at_idx\`(\`channel\`, \`at\`),
  INDEX \`visits_session_idx\`(\`session\`),
  PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
`;

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  // Changing the shape of the database is not an editor's job.
  if (session.role !== 'ADMIN') return unauthorized();

  const body = (await req.json().catch(() => ({}))) as { action?: string };
  if (body.action !== 'create-table') return badRequest('Unknown action.');

  try {
    await prisma.$executeRawUnsafe(CREATE_VISITS);
    // Prove it by reading it, rather than trusting that the statement ran.
    const snap = await readLiveSnapshot();
    if (!snap.available) {
      return json({ ok: false, error: 'The table was created but still cannot be read.' }, 500);
    }
    return json({ ok: true });
  } catch (err) {
    return json(
      {
        ok: false,
        error:
          'The database refused to create the table. The usual cause is that this ' +
          'database user cannot create tables. ' +
          String(err).slice(0, 300),
      },
      500
    );
  }
}
