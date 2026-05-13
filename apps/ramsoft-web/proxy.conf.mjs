/** Do not forward browser session headers; GSTZen treats them as web UI and returns Django CSRF HTML. */
const STRIP_FROM_GSTZEN_UPSTREAM = new Set([
  'cookie',
  'referer',
  'origin',
]);

/**
 * Angular dev-server (Vite) proxy: browser calls `/gstzen-proxy/...`, same-origin, no CORS.
 * Must match `/gstzen-proxy` and nested paths (`/~gstzen/...`).
 */
export default {
  '/gstzen-proxy': {
    target: 'https://my.gstzen.in',
    changeOrigin: true,
    secure: true,
    rewrite: (path) => path.replace(/^\/gstzen-proxy/, '') || '/',
    configure: (proxy) => {
      proxy.on('proxyReq', (proxyReq) => {
        for (const h of STRIP_FROM_GSTZEN_UPSTREAM) {
          proxyReq.removeHeader(h);
        }
      });
    },
  },
};
