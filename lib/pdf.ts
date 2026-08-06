import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Group } from "./types";
import { computeSummary } from "./split";

/**
 * Maps currency symbols to safe text equivalents for jsPDF native fonts.
 */
function getPdfCurrencyLabel(symbol: string): string {
  switch (symbol) {
    case "₹":
      return "Rs. ";
    case "€":
      return "EUR ";
    case "£":
      return "GBP ";
    case "¥":
      return "JPY ";
    case "$":
      return "$";
    default:
      return `${symbol} `;
  }
}

export async function generateGroupPDF(group: Group) {
  const payee = group.members.find((m) => m.id === group.payeeId);
  const payeeName = payee ? payee.name : "Payee";
  const totals = computeSummary(group);
  const totalBill = group.items.reduce((sum, item) => sum + item.price, 0);
  const formattedDate = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const currLabel = getPdfCurrencyLabel(group.currency);

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Strict Monochrome Palette
  const black: [number, number, number] = [0, 0, 0];
  const muted: [number, number, number] = [100, 100, 100];
  const lightBg: [number, number, number] = [250, 250, 250];
  const borderGray: [number, number, number] = [220, 220, 220];

  let y = 20;

  // --- HEADER ---
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...black);
  doc.text(group.name.toUpperCase(), 14, y);
  y += 7;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...muted);
  doc.text(`EXPENSE STATEMENT  |  GENERATED ON ${formattedDate.toUpperCase()}`, 14, y);
  y += 8;

  // Solid Black Divider
  doc.setDrawColor(...black);
  doc.setLineWidth(0.8);
  doc.line(14, y, 196, y);
  y += 8;

  // --- OVERVIEW CARD BOX (Black border, clean white surface) ---
  doc.setFillColor(...lightBg);
  doc.setDrawColor(...borderGray);
  doc.setLineWidth(0.3);
  doc.rect(14, y, 182, 22, "FD");

  // Overview Column 1: Total
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...muted);
  doc.text("TOTAL EXPENSES", 22, y + 7);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...black);
  doc.text(`${currLabel}${totalBill.toFixed(2)}`, 22, y + 15);

  // Overview Column 2: Paid Upfront
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...muted);
  doc.text("PAID UPFRONT BY", 85, y + 7);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...black);
  doc.text(payeeName, 85, y + 15);

  // Overview Column 3: Total Members
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...muted);
  doc.text("TOTAL MEMBERS", 148, y + 7);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...black);
  doc.text(`${group.members.length}`, 148, y + 15);

  y += 30;

  // --- SECTION 1: SETTLEMENT SUMMARY ---
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...black);
  doc.text("1. SETTLEMENT SUMMARY", 14, y);
  y += 6;

  const settlementRows = group.members.map((m) => {
    const isPayee = m.id === group.payeeId;
    const amount = totals[m.id] ?? 0;
    if (isPayee) {
      const owedToPayee = group.members
        .filter((mem) => mem.id !== group.payeeId)
        .reduce((sum, mem) => sum + (totals[mem.id] ?? 0), 0);
      return [
        m.name,
        "Payee (Upfront)",
        `${currLabel}${amount.toFixed(2)}`,
        `Receives ${currLabel}${owedToPayee.toFixed(2)} total`,
      ];
    } else {
      return [
        m.name,
        "Member",
        `${currLabel}${amount.toFixed(2)}`,
        `Owes ${currLabel}${amount.toFixed(2)} to ${payeeName}`,
      ];
    }
  });

  autoTable(doc, {
    startY: y,
    head: [["MEMBER", "ROLE", "ASSIGNED SHARE", "SETTLEMENT ACTION"]],
    body: settlementRows,
    theme: "grid",
    headStyles: {
      fillColor: black,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
      cellPadding: 3.5,
    },
    bodyStyles: {
      fontSize: 9.5,
      textColor: black,
      cellPadding: 3.5,
    },
    columnStyles: {
      0: { cellWidth: 45 },
      1: { cellWidth: 35 },
      2: { cellWidth: 35, halign: "right" },
      3: { cellWidth: "auto" },
    },
    alternateRowStyles: {
      fillColor: lightBg,
    },
    margin: { left: 14, right: 14 },
  });

  const autoTableInfo = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
  y = (autoTableInfo?.finalY ?? y) + 14;

  // --- SECTION 2: ITEMIZED BREAKDOWN ---
  if (y > 230) {
    doc.addPage();
    y = 20;
  }

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...black);
  doc.text("2. ITEMIZED BREAKDOWN", 14, y);
  y += 6;

  if (group.items.length === 0) {
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...muted);
    doc.text("No items added to this group yet.", 14, y);
  } else {
    for (let index = 0; index < group.items.length; index++) {
      const item = group.items[index];

      // Page break check
      if (y > 230) {
        doc.addPage();
        y = 20;
      }

      const itemName = item.name.trim() || `Item #${index + 1}`;

      // Minimal Item Header Bar
      doc.setFillColor(...lightBg);
      doc.setDrawColor(...borderGray);
      doc.setLineWidth(0.3);
      doc.rect(14, y, 182, 8, "FD");

      doc.setFontSize(9.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...black);
      doc.text(`${index + 1}. ${itemName.toUpperCase()}`, 18, y + 5.5);

      doc.setFontSize(9.5);
      doc.setFont("helvetica", "bold");
      doc.text(`TOTAL: ${currLabel}${item.price.toFixed(2)}`, 190, y + 5.5, {
        align: "right",
      });

      y += 10;

      const itemShareRows = item.includedMemberIds.map((mid) => {
        const member = group.members.find((m) => m.id === mid);
        const share = item.shares.find((s) => s.memberId === mid);
        const memberName = member ? member.name : "Unknown Member";
        const shareAmount = share ? share.amount : 0;
        const splitType = share?.locked ? "Custom (Locked)" : "Equal Split";

        return [
          memberName,
          `${currLabel}${shareAmount.toFixed(2)}`,
          splitType,
        ];
      });

      autoTable(doc, {
        startY: y,
        head: [["MEMBER", "CALCULATED SHARE", "SPLIT METHOD"]],
        body: itemShareRows,
        theme: "plain",
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: black,
          fontStyle: "bold",
          fontSize: 8.5,
          cellPadding: 2.5,
        },
        bodyStyles: {
          fontSize: 8.5,
          textColor: black,
          cellPadding: 2.5,
        },
        columnStyles: {
          0: { cellWidth: 70 },
          1: { cellWidth: 50, halign: "right" },
          2: { cellWidth: "auto" },
        },
        margin: { left: 14, right: 14 },
      });

      const itemAutoTableInfo = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
      y = (itemAutoTableInfo?.finalY ?? y) + 8;
    }
  }

  // --- FOOTER AND PAGE NUMBERS ---
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Minimal Hairline Footer Divider
    doc.setDrawColor(...borderGray);
    doc.setLineWidth(0.3);
    doc.line(14, 282, 196, 282);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...muted);

    // Left Footer
    doc.text(`SPLITS  |  GROUP: ${group.name.toUpperCase()}`, 14, 287);

    // Right Footer
    doc.text(`PAGE ${i} OF ${pageCount}`, 196, 287, { align: "right" });
  }

  // Save PDF with clean filename
  const sanitizedName = group.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  doc.save(`${sanitizedName}_statement.pdf`);
}
