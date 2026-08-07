"use client";

import { useState } from "react";
import { CheckCircle2Icon, XCircleIcon, Loader2Icon, SmartphoneNfcIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUserProfile } from "@/hooks/use-user-profile";

interface UpiInputFlowProps {
  onSaved?: () => void;
  onSkip?: () => void;
  showSkip?: boolean;
  currentUpiId?: string | null;
}

type Step = "input" | "verifying" | "confirm" | "saving" | "done" | "error";

export function UpiInputFlow({ onSaved, onSkip, showSkip = true, currentUpiId }: UpiInputFlowProps) {
  const { saveUpiId, verifyUpiId } = useUserProfile();
  const [upiId, setUpiId] = useState(currentUpiId ?? "");
  const [step, setStep] = useState<Step>("input");
  const [verifiedName, setVerifiedName] = useState<string | null>(null);
  const [wasVerified, setWasVerified] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleVerify() {
    if (!upiId.trim()) return;
    setStep("verifying");
    setErrorMsg("");

    const result = await verifyUpiId(upiId.trim());
    if (!result.success) {
      setErrorMsg(result.error || "Could not verify UPI ID. Please check and try again.");
      setStep("error");
      return;
    }

    setVerifiedName(result.name);
    setWasVerified(result.verified);
    setStep("confirm");
  }

  async function handleSave() {
    setStep("saving");
    const ok = await saveUpiId(upiId.trim().toLowerCase(), verifiedName);
    if (ok) {
      setStep("done");
      onSaved?.();
    } else {
      setErrorMsg("Failed to save UPI ID. Please try again.");
      setStep("error");
    }
  }

  function handleRetry() {
    setStep("input");
    setErrorMsg("");
    setVerifiedName(null);
  }

  if (step === "done") {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <CheckCircle2Icon className="h-10 w-10 text-green-500" />
        <p className="font-semibold text-lg">UPI ID Saved!</p>
        <p className="text-sm text-muted-foreground">{upiId.toLowerCase()}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {step === "input" || step === "error" ? (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium">Your UPI ID</label>
            <Input
              placeholder="yourname@okaxis"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleVerify()}
              className="h-11 text-base"
              autoFocus
            />
            {step === "error" && (
              <p className="text-sm text-destructive flex items-center gap-1.5">
                <XCircleIcon className="h-4 w-4 shrink-0" />
                {errorMsg}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleVerify}
              disabled={!upiId.trim() || !upiId.includes("@")}
              className="flex-1 h-11"
            >
              Verify UPI ID
            </Button>
            {showSkip && (
              <Button variant="outline" onClick={onSkip} className="h-11">
                Skip
              </Button>
            )}
          </div>
        </>
      ) : step === "verifying" ? (
        <div className="flex flex-col items-center gap-3 py-6">
          <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verifying UPI ID...</p>
        </div>
      ) : step === "confirm" ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <SmartphoneNfcIcon className="h-4 w-4" />
              <span>UPI ID</span>
            </div>
            <p className="font-semibold text-base">{upiId.toLowerCase()}</p>
            {verifiedName ? (
              <div className="flex items-center gap-1.5 text-green-600 text-sm pt-1">
                <CheckCircle2Icon className="h-4 w-4" />
                <span>Verified as <strong>{verifiedName}</strong></span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground pt-1">Format valid (name not verified)</p>
            )}
          </div>

          {verifiedName && (
            <p className="text-sm text-center text-muted-foreground">
              Is this you? Confirm to save this UPI ID to your profile.
            </p>
          )}

          <div className="flex gap-2">
            <Button onClick={handleSave} className="flex-1 h-11">
              Yes, Save
            </Button>
            <Button variant="outline" onClick={handleRetry} className="h-11">
              No, Try Again
            </Button>
          </div>
        </div>
      ) : step === "saving" ? (
        <div className="flex flex-col items-center gap-3 py-6">
          <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Saving...</p>
        </div>
      ) : null}
    </div>
  );
}
