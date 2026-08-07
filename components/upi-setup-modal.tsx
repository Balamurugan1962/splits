"use client";

import { useState } from "react";
import { SmartphoneNfcIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { UpiInputFlow } from "@/components/upi-input-flow";

interface UpiSetupModalProps {
  open: boolean;
  onClose: () => void;
}

export function UpiSetupModal({ open, onClose }: UpiSetupModalProps) {
  return (
    <Dialog open={open}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <SmartphoneNfcIcon className="h-5 w-5" />
            </div>
            <DialogTitle className="text-xl">Set Up UPI</DialogTitle>
          </div>
          <DialogDescription>
            A UPI ID is required to receive payments in splits. You can change it anytime from Settings.
          </DialogDescription>
        </DialogHeader>

        <UpiInputFlow
          onSaved={onClose}
          showSkip={false}
        />
      </DialogContent>
    </Dialog>
  );
}
