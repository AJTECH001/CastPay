// CastPay Dashboard UI (Farcaster Mini App)
// Dark background with yellow accents; reusable components; NFT logic removed.

import React, { useEffect, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { useAccount, useConnect } from "wagmi";

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

export default function App() {
  const { isConnected, address } = useAccount();
  const { connect, connectors, status, error } = useConnect();

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

  useEffect(() => {
    sdk.actions.ready();
  }, []);

  // Placeholder: Load initial balance and recent txs (replace with API)
  useEffect(() => {
    if (!isConnected) return;
    setBalance("6815.53");
    setTxs([
      { id: "1", direction: "in", counterparty: "@alice", amount: "120", token: "USDC", date: "1 Jul 2024" },
      { id: "2", direction: "out", counterparty: "@bob", amount: "5", token: "USDC", date: "2 Jul 2024" },
    ]);
  }, [isConnected]);

  const openSend = () => setSendOpen(true);
  const openReceive = () => setReceiveOpen(true);

  const handleSendNext = (d: SendDetails) => {
    setDetails(d);
    setSendOpen(false);
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    setPending(true);
    // TODO: call backend to submit gasless payment via Paymaster/relayer
    await new Promise((r) => setTimeout(r, 1200));
    setPending(false);
    setConfirmOpen(false);
    setSuccessOpen(true);
    // Update local tx list
    if (details) {
      setTxs((prev) => [
        { id: crypto.randomUUID(), direction: "out", counterparty: details.username, amount: details.amount, token: details.token },
        ...prev,
      ]);
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
      <SendPaymentModal open={sendOpen} onClose={() => setSendOpen(false)} onNext={handleSendNext} />
      <ConfirmPaymentModal open={confirmOpen} onClose={() => setConfirmOpen(false)} details={details} onConfirm={handleConfirm} loading={pending} />
      <SuccessModal open={successOpen} onClose={() => setSuccessOpen(false)} onShare={handleShare} message="Your payment was sent. You can share it as a cast." />
      <ReceiveModal open={receiveOpen} onClose={() => setReceiveOpen(false)} address={address} />
    </Layout>
  );
}
