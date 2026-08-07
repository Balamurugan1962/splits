"use client";

import { AuthGuard } from "@/components/auth-guard";
import { UpiSettings } from "@/components/upi-settings";
import { useSession } from "@/lib/auth-client";
import { UserIcon, SmartphoneNfcIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export function SettingsContent() {
  const { data: session } = useSession();

  return (
    <AuthGuard>
      <div className="max-w-lg mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your profile and payment details.</p>
        </div>

        <Separator />

        {/* Account Section */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <UserIcon className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Account</h2>
          </div>
          <div className="p-4 rounded-lg border border-border bg-card flex items-center gap-3">
            {session?.user?.image ? (
              <img
                src={session.user.image}
                alt={session.user.name || ""}
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                {(session?.user?.name || session?.user?.email || "?")[0].toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold">{session?.user?.name || "—"}</p>
              <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
            </div>
          </div>
        </section>

        <Separator />

        {/* Payment Section */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <SmartphoneNfcIcon className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Payment</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Your UPI ID is used when others pay you in splits. It's stored securely and shown only to split members.
          </p>
          <UpiSettings />
        </section>
      </div>
    </AuthGuard>
  );
}
