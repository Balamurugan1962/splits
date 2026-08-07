"use client";

import { useState } from "react";
import { SmartphoneNfcIcon, PencilIcon, CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserProfile } from "@/hooks/use-user-profile";
import { UpiInputFlow } from "@/components/upi-input-flow";

export function UpiSettings() {
  const { profile, isLoading } = useUserProfile();
  const [editing, setEditing] = useState(false);

  function maskUpiId(upiId: string): string {
    const [handle, bank] = upiId.split("@");
    if (handle.length <= 2) return upiId;
    const masked = handle[0] + "*".repeat(Math.min(handle.length - 2, 4)) + handle[handle.length - 1];
    return `${masked}@${bank}`;
  }

  if (isLoading) {
    return <div className="h-16 animate-pulse bg-muted rounded-lg" />;
  }

  return (
    <div className="space-y-3">
      {!editing ? (
        <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <SmartphoneNfcIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">UPI ID</p>
              {profile?.upiId ? (
                <>
                  <p className="font-semibold">{maskUpiId(profile.upiId)}</p>
                  {profile.upiName && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <CheckIcon className="h-3 w-3 text-green-500" />
                      Verified as {profile.upiName}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground italic">Not set</p>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing(true)}
            className="gap-1.5"
          >
            <PencilIcon className="h-3.5 w-3.5" />
            {profile?.upiId ? "Change" : "Add"}
          </Button>
        </div>
      ) : (
        <div className="p-4 rounded-lg border border-border bg-card space-y-3">
          <p className="text-sm font-medium">
            {profile?.upiId ? "Change your UPI ID" : "Add your UPI ID"}
          </p>
          <UpiInputFlow
            onSaved={() => setEditing(false)}
            onSkip={() => setEditing(false)}
            showSkip={true}
            currentUpiId={profile?.upiId ?? ""}
          />
        </div>
      )}
    </div>
  );
}
