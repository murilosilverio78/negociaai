"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { Credor } from "@/lib/supabase";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [credor, setCredor] = useState<Credor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function getSession() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data } = await supabase
          .from("credores")
          .select("*")
          .eq("user_id", user.id)
          .single();
        setCredor(data);
      }

      setIsLoading(false);
    }

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);

      if (session?.user) {
        const { data } = await supabase
          .from("credores")
          .select("*")
          .eq("user_id", session.user.id)
          .single();
        setCredor(data);
      } else {
        setCredor(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setCredor(null);
  }

  return { user, credor, isLoading, signOut };
}
