import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import members from '../api/members.ts';
import stats from '../api/stats.ts';
import health from '../api/health.ts';
import hangouts from '../api/hangouts.ts';
import hangoutById from '../api/hangouts/[id].ts';
import type { VercelRequest, VercelResponse } from '@vercel/node';

type Handler = (req: VercelRequest, res: VercelResponse) => unknown;

function responseAdapter(res: ServerResponse): VercelResponse {
  const adapted = res as ServerResponse & VercelResponse;
  adapted.status = (code: number) => {
    res.statusCode = code;
    return adapted;
  };
  adapted.json = (body: unknown) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
    return adapted;
  };
  return adapted;
}

function requestAdapter(req: IncomingMessage, pathname: string): VercelRequest {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  const adapted = req as IncomingMessage & VercelRequest;
  adapted.query = {
    ...Object.fromEntries(url.searchParams),
    ...(pathname.match(/^\/api\/hangouts\/(\d+)$/) ? { id: pathname.split('/').pop() } : {}),
  };
  return adapted;
}

function selectHandler(pathname: string): Handler | undefined {
  if (pathname === '/api/members') return members as Handler;
  if (pathname === '/api/stats') return stats as Handler;
  if (pathname === '/api/health') return health as Handler;
  if (pathname === '/api/hangouts') return hangouts as Handler;
  if (/^\/api\/hangouts\/\d+$/.test(pathname)) return hangoutById as Handler;
  return undefined;
}

const server = createServer(async (req, res) => {
  const pathname = new URL(req.url ?? '/', 'http://127.0.0.1').pathname;
  const handler = selectHandler(pathname);

  if (!handler) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  try {
    await handler(requestAdapter(req, pathname), responseAdapter(res));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: message }));
    }
  }
});

server.listen(8787, '127.0.0.1', () => {
  console.log('Local API server running at http://127.0.0.1:8787');
});
