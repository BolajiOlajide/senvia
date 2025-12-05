# Local Tunnel Proxy

Expose a localhost OAuth callback endpoint through an ngrok tunnel while keeping full control over the local proxy behavior.

## Why This Tool Exists

When developing applications that integrate with OAuth providers (Google, GitHub, Stripe, etc.), the provider requires you to register a **redirect URI** — the URL where users are sent after authentication.

During local development, your app runs on `http://localhost:3000`, but OAuth providers won't accept `localhost` URLs. They require a public, internet-accessible URL. You have a few options:

1. **Use ngrok directly** – Quick, but couples your local development to ngrok's SDK, adds ngrok-specific logic to your code.
2. **Deploy to staging** – Slow iteration cycle; defeats the purpose of local development.
3. **Use a local tunnel proxy** – Decouple OAuth mechanics from your application code. Your app always listens on a local port; the tunnel is purely infrastructure.

This tool is **option 3**. It runs as a standalone process on your machine, transparently proxies traffic from a public ngrok URL to your local app, and gives you full control over how the tunnel behaves. Your application code never touches ngrok or tunneling logic.

## Key Benefits

- **Application-agnostic**: Works with any language, framework, or setup that listens on a local port.
- **Transparent proxying**: Your app doesn't know about ngrok or the tunnel; just listen locally.
- **Pre-flight validation**: Checks that your local port is reachable before starting the tunnel.
- **Graceful shutdown**: Properly cleans up both the proxy server and ngrok tunnel on Ctrl+C.
- **Clear, real-time logging**: See every request and any errors as they happen.
- **Secure by default**: Proxy only binds to 127.0.0.1 (not exposed externally without ngrok).

## Prerequisites

- Node.js 20 LTS (or newer)
- An ngrok account and authtoken ([Get your authtoken](https://dashboard.ngrok.com/get-started/your-authtoken))

## Installation

```bash
git clone <this-repo>
cd senvia
npm install
npm run build
```

Or install globally for quick access:

```bash
npm install -g local-tunnel-proxy
```

## Usage

```bash
npx local-tunnel-proxy --port 3000
```

### Options

- `--port <number>` (required) – Local port where your OAuth callback handler is running (e.g., 3000).
- `--host <host>` – Local host for the target app, defaults to `localhost`.
- `--ngrok-authtoken <token>` – Override the `NGROK_AUTHTOKEN` env var.
- `--print-url-only` – Print only the public ngrok URL (useful inside scripts).

### Example Output

```
Checking local target http://localhost:3000 for reachability...
[proxy] Listening on http://127.0.0.1:58234 -> http://localhost:3000
Public OAuth redirect base URL: https://abcd-1234.ngrok.io
Forwarding to http://localhost:3000
Configure your provider with redirect URI: https://abcd-1234.ngrok.io/oauth/callback (or append your own path).
Tunnel is running. Press Ctrl+C to stop.
```

## Step-by-Step: Configuring OAuth

### 1. Start the Tunnel

```bash
export NGROK_AUTHTOKEN=your_token_here
npx local-tunnel-proxy --port 3000
```

The tool will print a public URL like `https://abcd-1234.ngrok.io`.

### 2. Configure Your OAuth Provider

In your OAuth provider's settings, register the redirect URI:

```
https://abcd-1234.ngrok.io/oauth/callback
```

(Replace `/oauth/callback` with your actual callback path.)

### 3. Start Your Local App

In another terminal, start your app on port 3000:

```bash
npm run dev  # or however you start your app
```

Your app will receive requests proxied from the public ngrok URL to your local port.

### 4. Test the Flow

Visit your OAuth provider's login/authorization page. After authentication, you'll be redirected to the ngrok URL, which proxies to your local app—exactly as if it were public.

## Important Notes

### Ngrok URL Changes on Restart

The ngrok hostname changes every time you restart the tool **unless** you use a [reserved domain](https://ngrok.com/docs/network-edge/domains-and-certificates/). If you're testing frequently:

- Update your OAuth provider configuration when the URL changes, or
- Use ngrok's paid plan to reserve a domain for consistent URLs.

### Authtoken

The tool looks for your ngrok authtoken in this order:

1. `--ngrok-authtoken <token>` flag (for testing only; don't commit to version control).
2. `NGROK_AUTHTOKEN` environment variable (recommended; export in your shell or `.env`).

If neither is provided, the tool exits with a helpful error message.

### Local Port Unreachable

If the tool can't reach your local app (e.g., it's not running yet), it will fail with a clear error before starting ngrok, saving you from a half-configured tunnel.

## Architecture

The tool is composed of four focused modules:

- **index.ts**: CLI argument parsing and orchestration.
- **proxyServer.ts**: Express HTTP proxy listening on 127.0.0.1.
- **ngrokManager.ts**: Wrapper around ngrok SDK for tunnel lifecycle.
- **portChecker.ts**: Pre-flight validation of local target reachability.

All modules follow strict TypeScript with defensive error handling and graceful cleanup on shutdown.

## License

MIT
