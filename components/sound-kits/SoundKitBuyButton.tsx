"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { NeumorphicButton } from "@/components/ui/neumorphic/Button";
import {
  apiRequest,
  ApiRequestError,
  errorMessage,
  RequestError,
} from "@/components/studio/shared";

export function SoundKitBuyButton({
  kitId,
  version,
  assetVersion,
  price,
}: {
  kitId: string;
  version: number;
  assetVersion: number;
  price: number;
}) {
  const auth = useAuth(),
    router = useRouter(),
    key = useRef<string | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function buy() {
    if (auth.status !== "authenticated") {
      router.push(`/login?next=${encodeURIComponent(`/sound-kits/${kitId}`)}`);
      return;
    }
    setBusy(true);
    setError("");
    const attempt = `sound-kit:${kitId}:${version}:${assetVersion}`;
    key.current ??= sessionStorage.getItem(attempt) ?? crypto.randomUUID();
    sessionStorage.setItem(attempt, key.current);
    try {
      const result = await apiRequest<{
        paymentUrl?: string;
        redirectUrl?: string;
      }>("/api/sound-kits/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kitId,
          expectedVersion: version,
          expectedAssetVersion: assetVersion,
          expectedPrice: price,
          idempotencyKey: key.current,
        }),
      });
      window.location.assign(
        result.paymentUrl ?? result.redirectUrl ?? "/dashboard/orders",
      );
    } catch (value) {
      if (value instanceof ApiRequestError && value.status === 410) {
        key.current = null;
        sessionStorage.removeItem(attempt);
      }
      setError(errorMessage(value));
      setBusy(false);
    }
  }
  return (
    <div className="space-y-3">
      <NeumorphicButton
        variant="accent"
        disabled={busy || auth.status === "loading"}
        onClick={() => void buy()}
      >
        {busy
          ? "Preparing payment…"
          : auth.status === "authenticated"
            ? "Buy sound kit"
            : "Sign in to buy"}
      </NeumorphicButton>
      {error && <RequestError message={error} />}
    </div>
  );
}
