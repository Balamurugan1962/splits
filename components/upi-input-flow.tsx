"use client";

import { useState } from "react";
import { CheckCircle2Icon, XCircleIcon, Loader2Icon, SmartphoneNfcIcon, UserCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUserProfile } from "@/hooks/use-user-profile";
import { useSession } from "@/lib/auth-client";

interface UpiInputFlowProps {
  onSaved?: () => void;
  onSkip?: () => void;
  showSkip?: boolean;
  currentUpiId?: string | null;
}

type Step = "input" | "verifying" | "confirm" | "saving" | "done" | "error";

export function UpiInputFlow({ onSaved, onSkip, showSkip = true, currentUpiId }: UpiInputFlowProps) {
  const { profile, saveUpiId, verifyUpiId } = useUserProfile();
  const { data: session } = useSession();
  const [upiId, setUpiId] = useState(currentUpiId ?? "");
  const [step, setStep] = useState<Step>("input");
  const [verifiedName, setVerifiedName] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const displayName = verifiedName || profile?.name || session?.user?.name || "Account Owner";

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
    setStep("confirm");
  }

  async function handleSave() {
    setStep("saving");
    const ok = await saveUpiId(upiId.trim().toLowerCase(), displayName);
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
          <p className="text-sm text-muted-foreground">Checking UPI ID format...</p>
        </div>
      ) : step === "confirm" ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <SmartphoneNfcIcon className="h-4 w-4" />
                <span>UPI ID</span>
              </div>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
                Valid Format
              </span>
            </div>
            <p className="font-semibold text-base">{upiId.toLowerCase()}</p>
            
            <div className="pt-2 border-t border-border/50 flex items-center gap-2 text-sm">
              <UserCheckIcon className="h-4 w-4 text-primary" />
              <span>Recipient Name: <strong>{displayName}</strong></span>
            </div>
          </div>

          <p className="text-sm text-center text-muted-foreground">
            Confirm to save this UPI ID to your profile so members can pay you.
          </p>

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
          <p className="text-sm text-muted-foreground">Saving to profile...</p>
        </div>
      ) : null}
    </div>
  );
}
