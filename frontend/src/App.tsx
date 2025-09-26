// CastPay Dashboard UI - Web3 Payment App
// Dark background with yellow accents; reusable components; clean web app design.

import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

import Layout from "./components/Layout";
import Header from "./components/Header";
import BalanceCard from "./components/BalanceCard";
import ActionBar from "./components/ActionBar";
import Transactions, { type TxItem } from "./components/Transactions";
import Button from "./components/ui/Button";

import SendPaymentModal, { type SendDetails } from "./components/modals/SendPaymentModal";
import ConfirmPaymentModal from "./components/modals/ConfirmPaymentModal";
import SuccessModal from "./components/modals/SuccessModal";
import ReceiveModal from "./components/modals/ReceiveModal";
import { api } from "./lib/api";

export default function App() {
  const { isConnected, address } = useAccount();
  const { connect, connectors, status, error } = useConnect();
  const { disconnect } = useDisconnect();
  
  // Debug logging for connectors
  useEffect(() => {
    console.log('[CastPay] Available connectors:', connectors?.length || 0, 'connectors');
    console.log('[CastPay] Connection status:', status);
    console.log('[CastPay] Environment:', {
      isDev: import.meta.env.DEV,
      mode: import.meta.env.MODE,
      useLocalhost: import.meta.env.VITE_USE_LOCALHOST
    });
    if (error) {
      console.error('[CastPay] Connection error:', error);
      console.error('[CastPay] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
  }, [connectors, status, error]);
  

  // State: balance fetched from backend; transactions kept locally (TODO: fetch from backend)
  const [balance, setBalance] = useState<string>("0.00");
  const [txs, setTxs] = useState<TxItem[]>([]);

  // Modal flow state
  const [sendOpen, setSendOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [details, setDetails] = useState<SendDetails | null>(null);
  const [toAddress, setToAddress] = useState<`0x${string}` | "">("");
  const [sendError, setSendError] = useState<string>("");

  // Convert base units (6 decimals) to a human-readable decimal string
  function fromBaseUnits(units: string, decimals = 6): string {
    const neg = units.startsWith("-");
    const s = neg ? units.slice(1) : units;
    const padded = s.padStart(decimals + 1, "0");
    const intPart = padded.slice(0, padded.length - decimals);
    const fracPartRaw = padded.slice(padded.length - decimals);
    const fracPart = fracPartRaw.replace(/0+$/, "");
    const value = fracPart ? `${intPart}.${fracPart}` : intPart;
    return neg ? `-${value}` : value;
  }

  

  // App initialization
  useEffect(() => {
    console.log('[CastPay] App initialized');
    
    // Test backend connectivity
    const testBackend = async () => {
      try {
        console.log('[CastPay] Testing backend connectivity...');
        const response = await api.health();
        console.log('[CastPay] Backend health check successful:', response);
      } catch (error) {
        console.error('[CastPay] Backend health check failed:', error);
      }
    };
    
    testBackend();
  }, []);

  
  useEffect(() => {
    let abort = false;
    const load = async () => {
      if (!isConnected || !address) return;
      try {
        const b = await api.getBalance(address as `0x${string}`);
        if (!abort) setBalance(b.balance);
      } catch (e) {
        
      }
    };
    load();
    return () => { abort = true; };
  }, [isConnected, address]);

  // Load recent transactions from backend when connected
  useEffect(() => {
    let abort = false;
    const loadTxs = async () => {
      if (!isConnected || !address) return;
      try {
        const list = await api.listTransactions(address as `0x${string}`, 20);
        if (abort) return;
        const self = (address as string).toLowerCase();
        const items: TxItem[] = list.map((tx) => {
          const direction: TxItem["direction"] = tx.from.toLowerCase() === self ? "out" : "in";
          const counterparty = direction === "out" ? tx.to : tx.from;
          return {
            id: tx.txId,
            direction,
            counterparty,
            amount: fromBaseUnits(tx.amount, 6),
            token: "USDC",
            date: tx.timestamp ? new Date(tx.timestamp * 1000).toLocaleString() : "",
          };
        });
        setTxs(items);
      } catch (e) {
        
      }
    };
    loadTxs();
    return () => { abort = true; };
  }, [isConnected, address]);

  const openSend = () => setSendOpen(true);
  const openReceive = () => setReceiveOpen(true);

  const handleSendNext = async (d: SendDetails) => {
    setSendError("");
    setPending(true);
    try {
      // Resolve @username -> address
      const res = await api.resolveUsername(d.username);
      setToAddress(res.address as `0x${string}`);
      setDetails(d);
      setSendOpen(false);
      setConfirmOpen(true);
    } catch (e: any) {
      const msg = e?.message || "Failed to resolve username. Please try again.";
      const friendly = msg.includes('not found') || msg.includes('no verified')
        ? `We couldn't find a linked Ethereum address for ${d.username}. Please ensure they have a verified wallet address and try again.`
        : msg;
      setSendError(friendly);
    } finally {
      setPending(false);
    }
  };

  const handleConfirm = async () => {
    if (!details || !address || !toAddress) return;
    setPending(true);
    try {
      // 1) Get nonce
      const nr = await api.getNonce(address as `0x${string}`);
      const nonce = typeof nr.nonce === 'string' ? parseInt(nr.nonce) : (nr.nonce as number);

      // 2) Send payment request
      const resp = await api.sendPayment({
        from: address as `0x${string}`,
        to: toAddress as `0x${string}`,
        amount: details.amount,
        nonce,
      });

      
      setConfirmOpen(false);
      setSuccessOpen(true);
      const id = (resp.txId as string) || crypto.randomUUID();
      setTxs((prev) => [{ id, direction: "out", counterparty: details.username, amount: details.amount, token: details.token }, ...prev]);

      // Poll status and refresh balance on success
      const poll = async () => {
        try {
          const s = await api.getStatus(id);
          if (s.status === 'success' || s.status === 'failed') {
            // refresh balance
            const b = await api.getBalance(address as `0x${string}`);
            setBalance(b.balance);
            return;
          }
          setTimeout(poll, 1500);
        } catch {
          
        }
      };
      poll();
    } catch (e: any) {
      // Handle wallet/user rejection explicitly
      const msg = e?.message || '';
      const code = e?.code;
      if (code === 4001 || /User rejected/i.test(msg)) {
        alert("payment request was rejected. No funds were sent.");
      } else {
        alert(msg || "Payment failed. Please try again.");
      }
      
    } finally {
      setPending(false);
    }
  };

  const handleShare = () => {
    if (!details) return;
    // Simple sharing - copy to clipboard or use Web Share API
    const shareText = `I just sent ${details.amount} ${details.token} to ${details.username} with CastPay – gasless on Arbitrum!`;
    
    if (navigator.share) {
      navigator.share({
        title: 'CastPay Payment',
        text: shareText,
        url: window.location.origin,
      }).catch(console.error);
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText).then(() => {
        alert('Payment details copied to clipboard!');
      }).catch(console.error);
    }
  };

  return (
    <Layout>
      <Header title="CastPay" subtitle="Gasless USDC payments on Arbitrum" />

      {!isConnected ? (
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-center">
          <p className="text-slate-300 text-sm">Connect your wallet to start sending gasless payments.</p>
          
          {!connectors?.length ? (
            <div className="mt-4">
              <div className="text-yellow-400 font-semibold text-xs mb-2">No wallet connectors available</div>
              <div className="text-slate-400 text-xs">
                Unable to load wallet connectors. Please refresh the page or try a different browser.
              </div>
            </div>
          ) : (
            <>
              <Button
                className="mt-4"
                variant="primary"
                onClick={() => {
                  try {
                    const connector = connectors?.[0];
                    if (connector) {
                      console.log('[CastPay] Attempting to connect with first available connector');
                      connect({ connector });
                    } else {
                      console.error('[CastPay] No connector available');
                    }
                  } catch (err) {
                    console.error('[CastPay] Connect button error:', err);
                  }
                }}
                disabled={status === "pending"}
              >
                {status === "pending" ? "Connecting..." : "Connect Wallet"}
              </Button>
              
              {connectors?.length > 0 && (
                <div className="text-slate-400 text-xs mt-2">
                  {connectors.length} wallet connector{connectors.length !== 1 ? 's' : ''} available
                  <div className="mt-1 text-slate-500 text-xs">
                    💡 Install MetaMask or Coinbase Wallet for the best experience
                  </div>
                </div>
              )}
            </>
          )}
          
          {error && (
            <div className="text-red-400 font-semibold text-xs mt-2">
              {error?.message || error?.name || 'Connection failed'}
            </div>
          )}
        </div>
      ) : (
        <>
          <BalanceCard balance={balance} token="USDC" />

          <div className="mt-4">
            <ActionBar onSend={openSend} onReceive={openReceive} />
          </div>

          <Transactions items={txs} />

          <div className="mt-6 flex items-center justify-center gap-3">
            <Button variant="ghost" onClick={() => {
              const shareText = "Try CastPay for gasless payments on Arbitrum ✨";
              if (navigator.share) {
                navigator.share({
                  title: 'CastPay',
                  text: shareText,
                  url: window.location.origin,
                }).catch(console.error);
              } else if (navigator.clipboard) {
                navigator.clipboard.writeText(`${shareText} ${window.location.origin}`).then(() => {
                  alert('Share link copied to clipboard!');
                }).catch(console.error);
              }
            }}>
              Share CastPay
            </Button>
            <Button variant="secondary" onClick={() => disconnect()}>
              Disconnect
            </Button>
          </div>
        </>
      )}


      {/* Modals */}
      <SendPaymentModal open={sendOpen} onClose={() => setSendOpen(false)} onNext={handleSendNext} loading={pending} errorMessage={sendError} />
      <ConfirmPaymentModal open={confirmOpen} onClose={() => setConfirmOpen(false)} details={details} onConfirm={handleConfirm} loading={pending} toAddress={toAddress || undefined} />
      <SuccessModal open={successOpen} onClose={() => setSuccessOpen(false)} onShare={handleShare} message="Your payment was sent successfully!" />
      <ReceiveModal open={receiveOpen} onClose={() => setReceiveOpen(false)} address={address} />
    </Layout>
  );
}
