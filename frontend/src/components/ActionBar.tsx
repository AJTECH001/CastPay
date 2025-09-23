import React from "react";
import Button from "./ui/Button";

interface ActionBarProps {
  onSend: () => void;
  onReceive: () => void;
}

export default function ActionBar({ onSend, onReceive }: ActionBarProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Button variant="primary" full onClick={onSend}>
        Send Payment
      </Button>
      <Button variant="secondary" full onClick={onReceive}>
        Receive
      </Button>
    </div>
  );
}
