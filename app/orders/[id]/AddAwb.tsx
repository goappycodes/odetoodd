"use client";

import { useState } from "react";
import { CircleCheck } from "lucide-react";

const input = "w-full rounded-lg border border-line bg-card px-3 py-2 text-sm outline-none focus:border-ink/40";

/** AWB entry for a packed order. Saving starts live tracking and pushes the AWB to Shopify. */
export default function AddAwb({ international, shopify }: { international: boolean; shopify: boolean }) {
  const [provider, setProvider] = useState(international ? "DHL Express" : "Blue Dart");
  const [awb, setAwb] = useState("");
  const [saved, setSaved] = useState(false);

  if (saved)
    return (
      <div className="space-y-1 text-sm">
        <p className="flex items-center gap-2 font-medium text-good"><CircleCheck className="size-4" />AWB saved, tracking started</p>
        <p className="text-muted">{provider} {awb}. The order moves to Dispatched{shopify ? " and the AWB is added to the Shopify fulfilment, which notifies the customer" : ""}. This prototype doesn&apos;t save data.</p>
      </div>
    );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (awb.trim()) setSaved(true);
      }}
      className="space-y-3"
    >
      <p className="text-sm text-muted">Packed and waiting for a courier. Add the AWB to start tracking.</p>
      <label className="block text-sm">
        <span className="mb-1 block text-muted">Courier</span>
        <select className={input} value={provider} onChange={(e) => setProvider(e.target.value)}>
          <option>Blue Dart</option>
          <option>DHL Express</option>
          <option>Delhivery</option>
        </select>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-muted">AWB number</span>
        <input className={input} required value={awb} onChange={(e) => setAwb(e.target.value)} placeholder={provider === "DHL Express" ? "10 digits" : provider === "Blue Dart" ? "11 digits" : "13 digits"} inputMode="numeric" />
      </label>
      <button type="submit" className="w-full rounded-lg bg-ink px-3 py-2 text-sm font-medium text-paper hover:bg-ink/85">Save AWB and mark dispatched</button>
    </form>
  );
}
