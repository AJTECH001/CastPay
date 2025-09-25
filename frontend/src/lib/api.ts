export type ResolveResponse = {
  address: `0x${string}`;
  source?: string;
  username: string;
  displayName?: string;
  fid?: number;
};

export type NonceResponse = { address: `0x${string}`; nonce: string | number };

export type TransferRequest = {
  from: `0x${string}`;
  to: `0x${string}`;
  amount: string; // decimal USDC amount as string
  nonce: number;
  //signature: `0x${string}`;
};

export type TransferResponse = {
  txId: `0x${string}` | string;
  status: string;
  paymasterAddress?: `0x${string}`;
  message?: string;
};

export type StatusResponse = {
  txId: string;
  status: 'pending' | 'processing' | 'submitted' | 'success' | 'failed';
  timestamp?: number;
  details?: Record<string, unknown>;
};

export type BackendTransaction = {
  txId: string;
  from: `0x${string}`;
  to: `0x${string}`;
  amount: string; // in 6-decimal units
  status: StatusResponse['status'];
  timestamp?: number;
  lastUpdated?: number;
};

function baseUrl() {
  // In development, prefer the Vite proxy to avoid CORS, unless explicitly forced
  if (import.meta.env.DEV && import.meta.env.VITE_USE_DIRECT !== 'true') {
    console.debug('[api] Using dev proxy base /api');
    return '/api';
  }

  // Otherwise, try environment variable next
  const envUrl = import.meta.env.VITE_API_BASE;
  if (envUrl) {
    const cleaned = envUrl.replace(/\/$/, '');
    console.debug('[api] Using VITE_API_BASE:', cleaned);
    return cleaned;
  }

  // As a last resort, use the known backend URL (may trigger CORS if not proxied)
  const fallbackUrl = 'https://00692bb93831.ngrok-free.app';
  if (typeof window !== 'undefined') {
    // Log once per session to help diagnose environment misconfig
    (window as any).__CASTPAY_BASE_WARNED__ || console.warn('VITE_API_BASE is not set. Using fallback URL:', fallbackUrl);
    (window as any).__CASTPAY_BASE_WARNED__ = true;
  }
  return fallbackUrl;
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let payload: any = undefined;
    try { payload = await res.json(); } catch {}
    throw new Error(payload?.error || payload?.message || `HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  resolveUsername: async (username: string) => {
    const res = await fetch(`${baseUrl()}/users/resolve/${encodeURIComponent(username.replace(/^@/, ''))}`);
    return handle<ResolveResponse>(res);
  },
  getNonce: async (address: `0x${string}`) => {
    const res = await fetch(`${baseUrl()}/users/nonce/${address}`);
    return handle<NonceResponse>(res);
  },
  sendPayment: async (data: TransferRequest) => {
    const res = await fetch(`${baseUrl()}/payments/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handle<TransferResponse>(res);
  },
  getStatus: async (txId: string) => {
    const res = await fetch(`${baseUrl()}/payments/status/${txId}`);
    return handle<StatusResponse>(res);
  },
  listTransactions: async (address: `0x${string}`, limit = 20) => {
    const params = new URLSearchParams({ address, limit: String(limit) });
    const res = await fetch(`${baseUrl()}/payments/transactions?${params.toString()}`);
    return handle<BackendTransaction[]>(res);
  },
  getBalance: async (address: `0x${string}`) => {
    const res = await fetch(`${baseUrl()}/payments/balance/${address}`);
    return handle<{ address: string; balance: string; paymasterAllowance?: string; paymasterAddress?: string }>(res);
  },
  health: async () => {
    const res = await fetch(`${baseUrl()}/health`);
    return handle<any>(res);
  },
};
