"use client";

import { FileDownIcon, PrinterIcon, Share2Icon, CheckCircle2Icon, CircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { computeSummary } from "@/lib/split";
import { generateGroupPDF } from "@/lib/pdf";
import type { Group, Member } from "@/lib/types";

interface SplitSummaryProps {
  group: Group;
  paidMemberIds?: string[];
  onTogglePaid?: (memberId: string) => void;
  onCloseSplit?: () => void;
  currentUserId?: string;
  isOwner?: boolean;
}

export function SplitSummary({
  group,
  paidMemberIds = [],
  onTogglePaid,
  onCloseSplit,
  currentUserId,
  isOwner = false,
}: SplitSummaryProps) {
  const payee = group.members.find((m) => m.id === group.payeeId);
  const payeeName = payee ? payee.name : "Payee";
  const totals = computeSummary(group);
  const totalBill = group.items.reduce((sum, it) => sum + it.price, 0);

  // Total owed to the payee by everyone else
  const totalOwedToPayee = group.members
    .filter((m) => m.id !== group.payeeId)
    .reduce((sum, m) => sum + (totals[m.id] ?? 0), 0);

  function handleDownloadPDF() {
    generateGroupPDF(group);
  }

  function handlePrint() {
    window.print();
  }

  function handleWhatsAppGroupShare() {
    const nonPayeeDebts = group.members
      .filter((m) => m.id !== group.payeeId)
      .map(
        (m) =>
          `• ${m.name}: ${group.currency}${(totals[m.id] ?? 0).toFixed(2)}${
            paidMemberIds.includes(m.id) ? " (Paid)" : ""
          }`
      )
      .join("\n");

    const message =
      `Expense split for ${group.name}:\n\n` +
      `Paid by ${payeeName}: ${group.currency}${totalBill.toFixed(2)}\n\n` +
      `Shares to pay ${payeeName}:\n` +
      `${nonPayeeDebts}`;

    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  }

  function handleWhatsAppMemberShare(m: Member, amount: number) {
    const message = `Hey ${m.name}, your share for ${group.name} comes to ${group.currency}${amount.toFixed(2)} (paid by ${payeeName}).`;

    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  }

  return (
    <div className="mb-6 space-y-4">
      {/* Top Header Row with Title, Payee info & PDF/WhatsApp/Close Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-xl sm:text-2xl">Split Summary</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Total <span className="font-medium text-foreground">{group.currency}{totalBill.toFixed(2)}</span> paid by <span className="font-medium text-foreground">{payeeName}</span>
          </p>
        </div>

        {/* Action Buttons: WhatsApp Share, Download PDF, Print, and Close Split */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto shrink-0">
          <Button
            onClick={handleWhatsAppGroupShare}
            variant="default"
            className="flex-1 sm:flex-none gap-1.5 sm:gap-2 text-sm sm:text-base h-10 sm:h-11 px-3 bg-emerald-600 hover:bg-emerald-700 text-white border-0"
          >
            <Share2Icon className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="truncate">Share via WhatsApp</span>
          </Button>

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

      {/* Unboxed Settlement List */}
      <div className="space-y-2">
        {group.members.map((m) => {
          const amount = totals[m.id] ?? 0;
          const isPayee = m.id === group.payeeId;
          const isPaid = paidMemberIds.includes(m.id);

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

              <div className="flex items-center gap-3 shrink-0">
                {/* Only Split Owner can click "Mark Paid" */}
                {!isPayee && isOwner && onTogglePaid && (
                  <Button
                    variant={isPaid ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => onTogglePaid(m.id)}
                    className={`h-8 px-2.5 text-xs gap-1.5 font-medium transition-colors ${
                      isPaid
                        ? "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 dark:text-emerald-400"
                        : "hover:border-emerald-500 hover:text-emerald-600"
                    }`}
                    title={isPaid ? "Mark as unpaid" : "Mark as paid"}
                  >
                    {isPaid ? (
                      <>
                        <CheckCircle2Icon className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Paid</span>
                      </>
                    ) : (
                      <>
                        <CircleIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>Mark Paid</span>
                      </>
                    )}
                  </Button>
                )}

                {/* Non-owner view: static Paid badge */}
                {!isPayee && !isOwner && isPaid && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 border border-emerald-500/30 px-2 py-0.5 bg-emerald-500/10 shrink-0">
                    <CheckCircle2Icon className="h-3.5 w-3.5 text-emerald-600" />
                    Paid
                  </span>
                )}

                {!isPayee && amount > 0 && !isPaid && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleWhatsAppMemberShare(m, amount)}
                    className="h-8 px-2 text-xs gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                    title={`Send WhatsApp request to ${m.name}`}
                  >
                    <Share2Icon className="h-3.5 w-3.5" />
                    <span className="hidden xs:inline">Request</span>
                  </Button>
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
