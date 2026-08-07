import type { Metadata } from "next";
import { SettingsContent } from "./settings-content";

export const metadata: Metadata = {
  title: "Settings · Splits",
  description: "Manage your profile, UPI ID and payment settings.",
};

export default function SettingsPage() {
  return <SettingsContent />;
}
