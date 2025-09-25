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
  signature: `0x${string}`;
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
  const url = (import.meta as any).env?.VITE_API_BASE as string | undefined;
  return url?.replace(/\/$/, '') || '';
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
    const res = await fetch(`${baseUrl()}/resolve/${encodeURIComponent(username.replace(/^@/, ''))}`);
    return handle<ResolveResponse>(res);
  },
  getNonce: async (address: `0x${string}`) => {
    const res = await fetch(`${baseUrl()}/nonce/${address}`);
    return handle<NonceResponse>(res);
  },
  sendPayment: async (data: TransferRequest) => {
    const res = await fetch(`${baseUrl()}/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handle<TransferResponse>(res);
  },
  getStatus: async (txId: string) => {
    const res = await fetch(`${baseUrl()}/status/${txId}`);
    return handle<StatusResponse>(res);
  },
  listTransactions: async (address: `0x${string}`, limit = 20) => {
    const params = new URLSearchParams({ address, limit: String(limit) });
    const res = await fetch(`${baseUrl()}/transactions?${params.toString()}`);
    return handle<BackendTransaction[]>(res);
  },
  getBalance: async (address: `0x${string}`) => {
    const res = await fetch(`${baseUrl()}/balance/${address}`);
    return handle<{ address: string; balance: string; paymasterAllowance?: string; paymasterAddress?: string }>(res);
  },
  health: async () => {
    const res = await fetch(`${baseUrl()}/health`);
    return handle<any>(res);
  },
};
