#!/usr/bin/env node
import { Command } from 'commander';
import { ensurePortReachable } from './portChecker';
import { startProxyServer, ProxyServerHandle } from './proxyServer';
import { startTunnel, TunnelHandle } from './ngrokManager';

interface CliOptions {
  port: string;
  host?: string;
  ngrokAuthtoken?: string;
  printUrlOnly?: boolean;
}

async function main() {
  const program = new Command();
  program
    .name('local-tunnel-proxy')
    .description(
      'Expose a localhost OAuth callback endpoint via ngrok with transparent proxying.',
    )
    .requiredOption('-p, --port <number>', 'Local target port to forward to')
    .option('--host <host>', 'Local target host', 'localhost')
    .option(
      '--ngrok-authtoken <token>',
      'ngrok authtoken (falls back to NGROK_AUTHTOKEN env var)',
    )
    .option(
      '--print-url-only',
      'Print only the public ngrok URL (handy for scripting)',
    );

  program.parse(process.argv);
  const options = program.opts<CliOptions>();

  const targetPort = Number.parseInt(options.port, 10);
  if (Number.isNaN(targetPort)) {
    throw new Error('--port must be a number, e.g. 3000');
  }

  const targetHost = options.host ?? 'localhost';
  const authtoken = options.ngrokAuthtoken ?? process.env.NGROK_AUTHTOKEN;

  if (!authtoken) {
    throw new Error(
      'Missing ngrok authtoken. Prefer exporting NGROK_AUTHTOKEN (or use --ngrok-authtoken for testing only).',
    );
  }

  console.log(
    `Checking local target http://${targetHost}:${targetPort} for reachability...`,
  );
  await ensurePortReachable(targetHost, targetPort);

  const proxyHandle = await startProxyServer({
    targetHost,
    targetPort,
  });

  const tunnelHandle = await startTunnel({
    authtoken,
    addr: proxyHandle.port,
    onStatusChange: (status) => console.log(`[ngrok] ${status}`),
  });

  announceTunnel(tunnelHandle.url, targetHost, targetPort, options.printUrlOnly);
  wireShutdownHooks(proxyHandle, tunnelHandle);

  console.log('Tunnel is running. Press Ctrl+C to stop.');
}

function announceTunnel(
  url: string,
  targetHost: string,
  targetPort: number,
  printUrlOnly?: boolean,
) {
  if (printUrlOnly) {
    console.log(url);
    return;
  }

  console.log(
    `Public OAuth redirect base URL: ${url}\nForwarding to http://${targetHost}:${targetPort}`,
  );
  console.log(
    `Configure your provider with redirect URI: ${url}/oauth/callback (or append your own path).`,
  );
}

function wireShutdownHooks(
  proxyHandle: ProxyServerHandle,
  tunnelHandle: TunnelHandle,
) {
  let shuttingDown = false;

  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log('\nShutting down tunnel...');
    try {
      await tunnelHandle.stop();
    } catch (error) {
      console.error('Failed to stop ngrok cleanly:', error);
    }

    try {
      await proxyHandle.close();
    } catch (error) {
      console.error('Failed to stop proxy server cleanly:', error);
    }
    process.exit(0);
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

main().catch((error) => {
  if (error instanceof Error) {
    console.error(`Error: ${error.message}`);
  } else {
    console.error('Error:', error);
  }
  process.exit(1);
});
