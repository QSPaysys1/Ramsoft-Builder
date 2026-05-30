import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import type { IncomingMessage } from 'node:http';
import https from 'node:https';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerLlmApiHandlers } from './llm-api.handlers';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

const GSTZEN_UPSTREAM_HOST = 'my.gstzen.in';
const GSTZEN_PROXY_PREFIX = '/gstzen-proxy';

const HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
]);

/** Browser headers that trigger GSTZen Django session / CSRF HTML instead of JSON API. */
const STRIP_FROM_GSTZEN_UPSTREAM = new Set([
  'cookie',
  'referer',
  'origin',
]);

/**
 * SSR / prod Node: forward `/gstzen-proxy/**` → `https://my.gstzen.in/**` so `HttpClient` same-origin URLs
 * are not swallowed by SPA HTML fallback (fixes `Unexpected token '<'`).
 */
app.use((req, res, next): void => {
  const pathname = req.originalUrl?.split('?')[0] ?? '';
  const isProxy =
    pathname === GSTZEN_PROXY_PREFIX ||
    pathname.startsWith(`${GSTZEN_PROXY_PREFIX}/`);
  if (!isProxy) {
    next();
    return;
  }

  const query = req.originalUrl?.includes('?')
    ? req.originalUrl.slice(req.originalUrl.indexOf('?'))
    : '';

  let pathPlusQuery: string;
  if (pathname === GSTZEN_PROXY_PREFIX) {
    pathPlusQuery = query ? `/${query}` : '/';
  } else {
    const rest = pathname.slice(GSTZEN_PROXY_PREFIX.length);
    const pathOnly = rest.startsWith('/') ? rest : `/${rest}`;
    pathPlusQuery = pathOnly + query;
  }

  const outgoingHeaders: Record<string, string | string[] | undefined> = {};
  for (const [k, v] of Object.entries(req.headers)) {
    const lk = k.toLowerCase();
    if (
      v === undefined ||
      HOP_HEADERS.has(lk) ||
      STRIP_FROM_GSTZEN_UPSTREAM.has(lk)
    ) {
      continue;
    }
    outgoingHeaders[k] = v;
  }
  outgoingHeaders['host'] = GSTZEN_UPSTREAM_HOST;

  const upstreamReq = https.request(
    {
      hostname: GSTZEN_UPSTREAM_HOST,
      port: 443,
      path: pathPlusQuery,
      method: req.method,
      headers: outgoingHeaders as never,
      rejectUnauthorized: true,
    },
    (upstreamRes: IncomingMessage) => {
      res.statusCode = upstreamRes.statusCode ?? 502;
      for (const key of Object.keys(upstreamRes.headers)) {
        const lk = key.toLowerCase();
        const val = upstreamRes.headers[key];
        if (val === undefined || HOP_HEADERS.has(lk)) {
          continue;
        }
        if (Array.isArray(val)) {
          for (const v of val) {
            res.appendHeader(key, v);
          }
        } else {
          res.setHeader(key, val);
        }
      }
      upstreamRes.pipe(res);
    },
  );

  upstreamReq.on('error', () => {
    if (!res.headersSent) {
      res.status(502).send('Upstream connection failed');
    }
  });
  req.pipe(upstreamReq);
});

registerLlmApiHandlers(app);

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  })
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use('/**', (req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next()
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or any Node host.
 */
export const reqHandler = createNodeRequestHandler(app);
