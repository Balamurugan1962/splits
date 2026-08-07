"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2Icon, AlertCircleIcon, ArrowLeftIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { decodeGroupData } from "@/lib/share";
import { useGroups } from "@/hooks/use-groups";
import type { Group } from "@/lib/types";

export default function ImportGroupPage() {
  const router = useRouter();
  const { groups, createGroup, updateGroup } = useGroups();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [importedGroup, setImportedGroup] = useState<Group | null>(null);

  useEffect(() => {
    // Read from hash (#data=...) or query param (?data=...)
    let encodedData = "";
    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      if (hash.includes("data=")) {
        encodedData = hash.split("data=")[1];
      } else {
        const params = new URLSearchParams(window.location.search);
        encodedData = params.get("data") || "";
      }
    }

    if (!encodedData) {
      setStatus("error");
      return;
    }

    const decoded = decodeGroupData(encodedData);
    if (!decoded) {
      setStatus("error");
      return;
    }

    setImportedGroup(decoded);

    // Save or update in localStorage
    const existingIndex = groups.findIndex((g) => g.id === decoded.id);
    if (existingIndex >= 0) {
      updateGroup(decoded);
    } else {
      createGroup(decoded);
    }

    setStatus("success");

    // Redirect automatically after brief delay
    const timer = setTimeout(() => {
      router.push(`/group/${decoded.id}`);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="max-w-md mx-auto py-12 px-4 text-center">
      {status === "loading" && (
        <div className="space-y-4">
          <p className="text-xl font-medium animate-pulse">
            Importing shared group...
          </p>
        </div>
      )}

      {status === "success" && importedGroup && (
        <div className="space-y-4 border border-border p-6 bg-card">
          <CheckCircle2Icon className="h-12 w-12 text-emerald-600 mx-auto" />
          <h1 className="text-2xl font-bold">Group Imported!</h1>
          <p className="text-base text-muted-foreground">
            Successfully imported{" "}
            <strong className="text-foreground">{importedGroup.name}</strong> into your browser.
          </p>
          <Button
            onClick={() => router.push(`/group/${importedGroup.id}`)}
            className="w-full h-11 text-base"
          >
            Open Group Workspace
          </Button>
        </div>
      )}

      {status === "error" && (
        <div className="space-y-4 border border-border p-6 bg-card">
          <AlertCircleIcon className="h-12 w-12 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold">Invalid Invite Link</h1>
          <p className="text-base text-muted-foreground">
            Could not decode the group data from this invite link.
          </p>
          <Link href="/">
            <Button variant="outline" className="w-full h-11 text-base gap-2 mt-2">
              <ArrowLeftIcon className="h-4 w-4" />
              Go to Home Page
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
