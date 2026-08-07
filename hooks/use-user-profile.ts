"use client";

import { useState, useCallback, useEffect } from "react";
import { useSession } from "@/lib/auth-client";

interface UserProfile {
  upiId: string | null;
  upiName: string | null;
  name: string;
  email: string;
  image: string | null;
}

const PROFILE_CACHE_KEY = "splits-user-profile";

function getCachedProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setCachedProfile(profile: UserProfile | null) {
  if (typeof window === "undefined") return;
  try {
    if (profile) {
      localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
    } else {
      localStorage.removeItem(PROFILE_CACHE_KEY);
    }
  } catch {}
}

export function useUserProfile() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(() => getCachedProfile());
  const [isLoading, setIsLoading] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!session?.user) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/user/profile");
      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          setProfile(data.profile);
          setCachedProfile(data.profile);
        }
      }
    } catch (err) {
      console.error("fetchProfile error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (session?.user) {
      fetchProfile();
    } else {
      setProfile(null);
      setCachedProfile(null);
    }
  }, [session?.user?.id]);

  const saveUpiId = useCallback(
    async (upiId: string, upiName: string | null) => {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ upiId, upiName }),
      });
      if (res.ok) {
        const updated = { ...profile!, upiId, upiName };
        setProfile(updated);
        setCachedProfile(updated);
      }
      return res.ok;
    },
    [profile]
  );

  const verifyUpiId = useCallback(async (upiId: string) => {
    const res = await fetch("/api/user/verify-upi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ upiId }),
    });
    const data = await res.json();
    return data as { success: boolean; name: string | null; upiId: string; verified: boolean; error?: string };
  }, []);

  return { profile, isLoading, saveUpiId, verifyUpiId, refresh: fetchProfile };
}
