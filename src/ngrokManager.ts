import * as ngrok from '@ngrok/ngrok';

export interface TunnelConfig {
  readonly authtoken: string;
  readonly addr: number;
  readonly onStatusChange?: (status: string) => void;
}

export interface TunnelHandle {
  readonly url: string;
  stop: () => Promise<void>;
}

export const startTunnel = async (config: TunnelConfig): Promise<TunnelHandle> => {
  try {
    const listener = await ngrok.forward({
      addr: config.addr,
      authtoken: config.authtoken,
    });

    const url = listener.url();
    if (!url) {
      throw new Error('Failed to get tunnel URL');
    }

    return {
      url,
      stop: async () => {
        await listener.close();
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown ngrok error';
    throw new Error(`Failed to start ngrok tunnel: ${message}`);
  }
}
