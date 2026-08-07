"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2Icon, AlertCircleIcon, ArrowLeftIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AuthGuard } from "@/components/auth-guard";
import type { Group } from "@/lib/types";

export default function JoinGroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [joinedGroup, setJoinedGroup] = useState<Group | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function doJoin() {
      try {
        const res = await fetch(`/api/groups/${id}/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (res.ok) {
          const data = await res.json();
          setJoinedGroup(data.group);
          setStatus("success");

          // Auto-redirect to workspace after 1 second
          setTimeout(() => {
            router.push(`/group/${id}`);
          }, 1000);
        } else {
          const data = await res.json();
          setErrorMsg(data.error || "Failed to join group.");
          setStatus("error");
        }
      } catch (err) {
        setErrorMsg("Network error trying to join group.");
        setStatus("error");
      }
    }

    doJoin();
  }, [id, router]);

  return (
    <AuthGuard>
      <div className="max-w-md mx-auto py-16 px-4 text-center">
        {status === "loading" && (
          <div className="space-y-4 border border-border p-8 bg-card">
            <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
            <h1 className="text-xl font-bold">Joining Group...</h1>
            <p className="text-sm text-muted-foreground animate-pulse">
              Connecting your user account to the group...
            </p>
          </div>
        )}

        {status === "success" && joinedGroup && (
          <div className="space-y-4 border border-border p-8 bg-card">
            <CheckCircle2Icon className="h-14 w-14 text-emerald-600 mx-auto" />
            <h1 className="text-2xl font-bold">Joined Group!</h1>
            <p className="text-base text-muted-foreground">
              You are now an official member of{" "}
              <strong className="text-foreground">{joinedGroup.name}</strong>.
            </p>
            <Button
              onClick={() => router.push(`/group/${id}`)}
              className="w-full h-11 text-base mt-2"
            >
              Open Group Workspace
            </Button>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4 border border-border p-8 bg-card">
            <AlertCircleIcon className="h-14 w-14 text-destructive mx-auto" />
            <h1 className="text-2xl font-bold">Could Not Join Group</h1>
            <p className="text-base text-muted-foreground">
              {errorMsg || "The invite link may be invalid or expired."}
            </p>
            <Link href="/">
              <Button variant="outline" className="w-full h-11 text-base gap-2 mt-2">
                <ArrowLeftIcon className="h-4 w-4" />
                Go to Your Groups
              </Button>
            </Link>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
