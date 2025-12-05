import express, { Request, Response, NextFunction } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { AddressInfo } from 'net';
import http from 'http';

export interface ProxyServerConfig {
  readonly targetHost: string;
  readonly targetPort: number;
}

export interface ProxyServerHandle {
  readonly port: number;
  close: () => Promise<void>;
}

export async function startProxyServer(
  config: ProxyServerConfig,
): Promise<ProxyServerHandle> {
  const target = `http://${config.targetHost}:${config.targetPort}`;
  const app = express();
  app.disable('x-powered-by');

  app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`[proxy] ${req.method} ${req.url}`);
    next();
  });

  app.use(
    createProxyMiddleware({
      target,
      changeOrigin: true,
      logLevel: 'warn',
      preserveHeaderKeyCase: true,
      onError: (err, _req, res) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[proxy] Error forwarding request:', msg);
        if (!res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'text/plain' });
        }
        res.end('Local target is unavailable. Check that your app is running.');
      },
    }),
  );

  const server = http.createServer(app);
  server.setTimeout(30_000); // 30s timeout for slow or hanging connections

  return new Promise<ProxyServerHandle>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address() as AddressInfo;
      console.log(
        `[proxy] Listening on http://127.0.0.1:${address.port} -> ${target}`,
      );
      resolve({
        port: address.port,
        close: () =>
          new Promise<void>((closeResolve, closeReject) => {
            server.close((maybeError) => {
              if (maybeError) {
                closeReject(maybeError);
              } else {
                closeResolve();
              }
            });
          }),
      });
    });
  });
}
