// CastPay Dashboard UI (Farcaster Mini App)
// Dark background with yellow accents; reusable components; NFT logic removed.

import React, { useEffect, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { useAccount, useConnect, useSignMessage } from "wagmi";

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
  const { signMessageAsync } = useSignMessage();

  // Demo state: balance & transactions (to be fetched from backend later)
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

  // Convert decimal (e.g., "5.25") to base units string with 6 decimals (e.g., "5250000")
  function toBaseUnits(amount: string, decimals = 6): string {
    const trimmed = amount.trim();
    if (!trimmed) return "0";
    const neg = trimmed.startsWith("-");
    const a = neg ? trimmed.slice(1) : trimmed;
    const [intPartRaw, fracPartRaw = ""] = a.split(".");
    const intPart = intPartRaw.replace(/^0+(?=\d)/, "");
    const fracPadded = (fracPartRaw + "".padEnd(decimals, "0")).slice(0, decimals);
    const joined = `${intPart || "0"}${fracPadded}`.replace(/^0+(?=\d)/, "");
    const out = joined.length ? joined : "0";
    return neg ? `-${out}` : out;
  }

  useEffect(() => {
    sdk.actions.ready();
  }, []);

  
  useEffect(() => {
    let abort = false;
    const load = async () => {
      if (!isConnected || !address) return;
      try {
        const b = await api.getBalance(address as `0x${string}`);
        if (!abort) setBalance(b.balance);
      } catch (e) {
        // keep silent for now
      }
    };
    load();
    return () => { abort = true; };
  }, [isConnected, address]);

  const openSend = () => setSendOpen(true);
  const openReceive = () => setReceiveOpen(true);

  const handleSendNext = async (d: SendDetails) => {
    setSendError("");
    setPending(true);
    try {
      // Resolve @username -> address via backend
      const res = await api.resolveUsername(d.username);
      setToAddress(res.address as `0x${string}`);
      setDetails(d);
      setSendOpen(false);
      setConfirmOpen(true);
    } catch (e: any) {
      const msg = e?.message || "Failed to resolve username. Please try again.";
      const friendly = msg.includes('not found') || msg.includes('no verified')
        ? `We couldn't find a linked Ethereum address for ${d.username}. Ask them to link a wallet in Farcaster (Profile → Verified addresses) and try again.`
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
      // 1) Get nonce from backend
      const nr = await api.getNonce(address as `0x${string}`);
      const nonce = typeof nr.nonce === 'string' ? parseInt(nr.nonce) : (nr.nonce as number);

      // 2) Build message and sign via wagmi
      const amountWei = toBaseUnits(details.amount, 6);
      const message = `CastPay:${address}:${toAddress}:${amountWei}:${nonce}`;
      const signature = await signMessageAsync({ message });

      // 3) Submit payment to backend
      const resp = await api.sendPayment({
        from: address as `0x${string}`,
        to: toAddress as `0x${string}`,
        amount: details.amount,
        nonce,
        signature: signature as `0x${string}`,
      });

      // Optimistically update UI
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
          // stop polling on error
        }
      };
      poll();
    } catch (e: any) {
      alert(e?.message || "Payment failed. Please try again.");
    } finally {
      setPending(false);
    }
  };

  const handleShare = () => {
    if (!details) return;
    sdk.actions.composeCast({
      text: `I just sent ${details.amount} ${details.token} to ${details.username} with CastPay – gasless on Arbitrum!`,
    });
  };

  return (
    <Layout>
      <Header title="CastPay" subtitle="Gasless USDC payments on Arbitrum" />

      {!isConnected ? (
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-center">
          <p className="text-slate-300 text-sm">Connect your wallet to start sending gasless payments.</p>
          <Button
            className="mt-4"
            variant="primary"
            onClick={() => connect({ connector: connectors[0] })}
            disabled={status === "pending" || !connectors.length}
          >
            {status === "pending" ? "Connecting..." : "Connect Wallet"}
          </Button>
          {error && <div className="text-red-400 font-semibold text-xs mt-2">{error.message}</div>}
        </div>
      ) : (
        <>
          <BalanceCard balance={balance} token="USDC" />

          <div className="mt-4">
            <ActionBar onSend={openSend} onReceive={openReceive} />
          </div>

          <Transactions items={txs} />

          <div className="mt-6 text-center">
            <Button variant="ghost" onClick={() => sdk.actions.composeCast({ text: "Try CastPay for gasless payments on Arbitrum ✨" })}>
              Share CastPay on Farcaster
            </Button>
          </div>
        </>
      )}

      {/* Modals */}
      <SendPaymentModal open={sendOpen} onClose={() => setSendOpen(false)} onNext={handleSendNext} loading={pending} errorMessage={sendError} />
      <ConfirmPaymentModal open={confirmOpen} onClose={() => setConfirmOpen(false)} details={details} onConfirm={handleConfirm} loading={pending} toAddress={toAddress || undefined} />
      <SuccessModal open={successOpen} onClose={() => setSuccessOpen(false)} onShare={handleShare} message="Your payment was sent. You can share it as a cast." />
      <ReceiveModal open={receiveOpen} onClose={() => setReceiveOpen(false)} address={address} />
    </Layout>
  );
}
