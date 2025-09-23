import React, { useState } from "react";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Button from "../ui/Button";

export interface SendDetails {
  username: string; // @username
  amount: string; // numeric string
  token: string; // e.g., USDC
}

interface SendPaymentModalProps {
  open: boolean;
  onClose: () => void;
  onNext: (details: SendDetails) => void;
}

export default function SendPaymentModal({ open, onClose, onNext }: SendPaymentModalProps) {
  const [username, setUsername] = useState("@");
  const [amount, setAmount] = useState("");
  const [token, setToken] = useState("USDC");

  const canContinue = username.trim().length > 1 && amount.trim().length > 0 && Number(amount) > 0;

  return (
    <Modal open={open} onClose={onClose} title="Send Payment">
      <div className="space-y-3">
        <Input label="Recipient" placeholder="@username" value={username} onChange={(e) => setUsername(e.target.value)} />
        <div className="grid grid-cols-3 gap-3">
          <Input label="Amount" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="col-span-2" />
          <label className="block">
            <span className="block text-xs font-medium text-slate-300 mb-1">Token</span>
            <select
              className="w-full h-11 px-3 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-100 outline-none focus:ring-2 focus:ring-yellow-400"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            >
              <option value="USDC">USDC</option>
            </select>
          </label>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button
          variant="primary"
          onClick={() => onNext({ username, amount, token })}
          disabled={!canContinue}
        >
          Continue
        </Button>
      </div>
    </Modal>
  );
}
