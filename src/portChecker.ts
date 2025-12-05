import net from 'net';

export async function ensurePortReachable(
  host: string,
  port: number,
  timeoutMs = 3000,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });

    const cleanup = () => {
      socket.removeAllListeners();
      socket.destroy();
    };

    socket.setTimeout(timeoutMs);

    socket.once('connect', () => {
      cleanup();
      resolve();
    });

    socket.once('timeout', () => {
      cleanup();
      reject(
        new Error(
          `Timed out reaching ${host}:${port}. Ensure your local app is running.`,
        ),
      );
    });

    socket.once('error', (err) => {
      cleanup();
      const msg = err instanceof Error ? err.message : String(err);
      reject(
        new Error(
          `Unable to connect to ${host}:${port}. (${msg})`,
        ),
      );
    });
  });
}
