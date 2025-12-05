import ngrok from 'ngrok';

export interface TunnelConfig {
  readonly authtoken: string;
  readonly addr: number;
  readonly onStatusChange?: (status: string) => void;
}

export interface TunnelHandle {
  readonly url: string;
  stop: () => Promise<void>;
}

export async function startTunnel(config: TunnelConfig): Promise<TunnelHandle> {
  try {
    const url = await ngrok.connect({
      addr: config.addr,
      authtoken: config.authtoken,
      proto: 'http',
      onStatusChange: config.onStatusChange,
    });

    return {
      url,
      stop: async () => {
        try {
          await ngrok.disconnect(url);
        } catch (err) {
          console.warn('Warning: failed to disconnect ngrok tunnel:', err);
        }
        try {
          await ngrok.kill();
        } catch (err) {
          console.warn('Warning: failed to kill ngrok process:', err);
        }
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown ngrok error';
    throw new Error(`Failed to start ngrok tunnel: ${message}`);
  }
}
