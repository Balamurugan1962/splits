"use client";

import { useState, useEffect, useRef } from "react";
import {
  FileDownIcon,
  PrinterIcon,
  Share2Icon,
  CheckCircle2Icon,
  Smartphone,
  RefreshCwIcon,
  Loader2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { computeSummary } from "@/lib/split";
import { generateGroupPDF } from "@/lib/pdf";
import type { Group, Member, SplitSession } from "@/lib/types";

interface SplitSummaryProps {
  group: Group;
  split: SplitSession;
  paidMemberIds?: string[];
  onSelfMarkPaid?: (memberId: string) => void;
  currentUserId?: string;
  isOwner?: boolean;
  payeeUpiId?: string | null;
}

// Detect mobile device — UPI deep links only work on Android/iOS
function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { userAgentData?: { mobile: boolean } };
  if (nav.userAgentData) {
    return nav.userAgentData.mobile === true;
  }
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

function buildUpiLink(payeeUpiId: string, payeeName: string, amount: number, note: string): string {
  const params = new URLSearchParams({
    pa: payeeUpiId,
    pn: payeeName,
    am: amount.toFixed(2),
    cu: "INR",
    tn: note,
  });
  return `upi://pay?${params.toString()}`;
}

interface MemberPayStateProps {
  member: Member;
  amount: number;
  isPaid: boolean;
  isCurrentUser: boolean;
  payeeUpiId: string | null;
  payeeName: string;
  currency: string;
  splitName: string;
  onSelfMarkPaid: () => void;
  isOwner: boolean;
}

function MemberPayRow({
  member,
  amount,
  isPaid,
  isCurrentUser,
  payeeUpiId,
  payeeName,
  currency,
  splitName,
  onSelfMarkPaid,
  isOwner,
}: MemberPayStateProps) {
  const [payState, setPayState] = useState<"idle" | "awaiting_confirm" | "confirming">("idle");
  const mobile = useRef(isMobileDevice());

  // After returning from UPI app (tab becomes visible again), show confirmation
  useEffect(() => {
    if (payState !== "awaiting_confirm") return;
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        setPayState("awaiting_confirm");
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [payState]);

  function handlePay() {
    if (!payeeUpiId) return;
    const upiLink = buildUpiLink(payeeUpiId, payeeName, amount, `Split: ${splitName}`);
    window.location.href = upiLink;
    // After a short delay, assume UPI app opened and show confirmation
    setTimeout(() => setPayState("awaiting_confirm"), 1500);
  }

  function handleIvePaid() {
    setPayState("confirming");
    onSelfMarkPaid();
  }

  function handleRetry() {
    setPayState("idle");
  }

  if (isPaid) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 border border-emerald-500/30 px-2 py-0.5 bg-emerald-500/10 shrink-0">
        <CheckCircle2Icon className="h-3.5 w-3.5" />
        Paid
      </span>
    );
  }

  // Only show Pay button to the current member (not the payee, not other members)
  if (!isCurrentUser) return null;

  if (payState === "awaiting_confirm") {
    return (
      <div className="flex items-center gap-2 flex-wrap justify-end">
        <Button
          size="sm"
          onClick={handleIvePaid}
          className="h-8 px-3 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <CheckCircle2Icon className="h-3.5 w-3.5" />
          I've Paid
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRetry}
          className="h-8 px-2.5 text-xs gap-1.5"
        >
          <RefreshCwIcon className="h-3.5 w-3.5" />
          Retry
        </Button>
      </div>
    );
  }

  if (payState === "confirming") {
    return (
      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
        Marking...
      </span>
    );
  }

  // idle state — show Pay button (mobile only)
  if (!mobile.current) {
    return (
      <span className="text-xs text-muted-foreground hidden sm:inline">
        Open on phone to pay
      </span>
    );
  }

  if (!payeeUpiId) {
    return (
      <span className="text-xs text-muted-foreground italic">
        Payee hasn't set up UPI
      </span>
    );
  }

  return (
    <Button
      size="sm"
      onClick={handlePay}
      className="h-8 px-3 text-xs gap-1.5 bg-primary hover:bg-primary/90"
    >
      <Smartphone className="h-3.5 w-3.5" />
      Pay {currency}{amount.toFixed(2)}
    </Button>
  );
}

export function SplitSummary({
  group,
  split,
  paidMemberIds = [],
  onSelfMarkPaid,
  currentUserId,
  isOwner = false,
  payeeUpiId = null,
}: SplitSummaryProps) {
  const payee = group.members.find((m) => m.id === group.payeeId);
  const payeeName = payee ? payee.name : "Payee";
  const totals = computeSummary(group);
  const totalBill = group.items.reduce((sum, it) => sum + it.price, 0);

  const totalOwedToPayee = group.members
    .filter((m) => m.id !== group.payeeId)
    .reduce((sum, m) => sum + (totals[m.id] ?? 0), 0);

  function handleDownloadPDF() {
    generateGroupPDF(group);
  }

  function handlePrint() {
    window.print();
  }

  // WhatsApp share: group summary — only for split owner
  function handleWhatsAppGroupShare() {
    if (!isOwner) return;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const splitUrl = `${appUrl}/group/${group.id}/${split.id}`;
    const nonPayeeDebts = group.members
      .filter((m) => m.id !== group.payeeId)
      .map(
        (m) =>
          `• ${m.name}: ${group.currency}${(totals[m.id] ?? 0).toFixed(2)}${
            paidMemberIds.includes(m.id) ? " ✓ Paid" : ""
          }`
      )
      .join("\n");

    const message =
      `*${split.name}* — ${group.name}\n\n` +
      `Total: ${group.currency}${totalBill.toFixed(2)} (paid by ${payeeName})\n\n` +
      `Shares:\n${nonPayeeDebts}\n\n` +
      `View & pay: ${splitUrl}`;

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  }

  // WhatsApp share: individual member — only for split owner
  function handleWhatsAppMemberShare(m: Member, amount: number) {
    if (!isOwner) return;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const splitUrl = `${appUrl}/group/${group.id}/${split.id}`;
    const message =
      `Hey ${m.name}! 👋\n\n` +
      `Your share for *${split.name}* is ${group.currency}${amount.toFixed(2)} (to ${payeeName}).\n\n` +
      `Open split to pay: ${splitUrl}`;

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  }

  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-xl sm:text-2xl">Split Summary</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Total{" "}
            <span className="font-medium text-foreground">
              {group.currency}{totalBill.toFixed(2)}
            </span>{" "}
            paid by{" "}
            <span className="font-medium text-foreground">{payeeName}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto shrink-0">
          {/* WhatsApp share — owner only */}
          {isOwner && (
            <Button
              onClick={handleWhatsAppGroupShare}
              variant="default"
              className="flex-1 sm:flex-none gap-1.5 sm:gap-2 text-sm sm:text-base h-10 sm:h-11 px-3 bg-emerald-600 hover:bg-emerald-700 text-white border-0"
            >
              <Share2Icon className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="truncate">Share via WhatsApp</span>
            </Button>
          )}

          <Button
            onClick={handleDownloadPDF}
            variant="outline"
            className="h-10 sm:h-11 px-3 gap-1.5 text-sm sm:text-base"
            title="Download PDF report"
          >
            <FileDownIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">Download PDF</span>
          </Button>

          <Button
            onClick={handlePrint}
            variant="outline"
            size="icon"
            className="h-10 w-10 sm:h-11 sm:w-11 shrink-0"
            title="Print report"
          >
            <PrinterIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        {group.members.map((m) => {
          const amount = totals[m.id] ?? 0;
          const isPayee = m.id === group.payeeId;
          const isPaid = paidMemberIds.includes(m.id);
          const isCurrentUser = m.id === currentUserId;

          return (
            <div
              key={m.id}
              className={`flex items-center justify-between gap-3 px-3.5 sm:px-4 py-3 border transition-colors ${
                isPayee
                  ? "border-primary/30 bg-primary/5"
                  : isPaid
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-border bg-background"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-base sm:text-lg font-semibold truncate">{m.name}</span>
                {isPayee ? (
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider border border-primary/40 px-1.5 py-0.5 text-primary shrink-0">
                    Payee
                  </span>
                ) : (
                  <span className="text-xs sm:text-sm text-muted-foreground shrink-0 hidden sm:inline">
                    owes {payeeName}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                {/* WhatsApp individual share — owner only, unpaid members */}
                {!isPayee && isOwner && !isPaid && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleWhatsAppMemberShare(m, amount)}
                    className="h-8 px-2 text-xs gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                    title={`Send WhatsApp reminder to ${m.name}`}
                  >
                    <Share2Icon className="h-3.5 w-3.5" />
                    <span className="hidden xs:inline">Remind</span>
                  </Button>
                )}

                {/* Pay / I've Paid / Paid badge — for non-payee members */}
                {!isPayee && (
                  <MemberPayRow
                    member={m}
                    amount={amount}
                    isPaid={isPaid}
                    isCurrentUser={isCurrentUser}
                    payeeUpiId={payeeUpiId}
                    payeeName={payeeName}
                    currency={group.currency}
                    splitName={split.name}
                    onSelfMarkPaid={() => onSelfMarkPaid?.(m.id)}
                    isOwner={isOwner}
                  />
                )}

                <div className="text-right">
                  {isPayee ? (
                    <div className="flex flex-col items-end">
                      <span className="text-base sm:text-lg font-bold tabular-nums text-primary">
                        + {group.currency}{totalOwedToPayee.toFixed(2)}
                      </span>
                      <span className="text-[11px] sm:text-xs text-muted-foreground">
                        Share: {group.currency}{amount.toFixed(2)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end">
                      <span
                        className={`text-base sm:text-lg font-bold tabular-nums ${
                          isPaid ? "text-emerald-600 line-through opacity-70" : "text-foreground"
                        }`}
                      >
                        {group.currency}{amount.toFixed(2)}
                      </span>
                      <span className="text-[11px] text-muted-foreground sm:hidden">
                        Owed to {payeeName}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Separator />
    </div>
  );
}
