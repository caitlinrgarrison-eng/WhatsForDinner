"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { UserSession } from "@/lib/types";

interface AuthPanelProps {
  session: UserSession | null;
  onLocalLogin: (email: string, displayName: string) => void;
  onLogout: () => void;
  compact?: boolean;
  mode?: "login" | "signup";
}

export function AuthPanel({
  session,
  onLocalLogin,
  onLogout,
  compact = false,
  mode = "login",
}: AuthPanelProps) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");

  const supabase = getSupabaseBrowserClient();

  const handleMagicLink = async () => {
    if (!supabase || !email) return;
    const { error } = await supabase.auth.signInWithOtp({ email });
    setMessage(error ? error.message : "Check your email for the sign-in link.");
  };

  if (session) {
    return (
      <section
        className={
          compact
            ? "rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-xs text-[var(--text)]"
            : "rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--text)]"
        }
      >
        <p className="font-medium text-[var(--text)]">Signed in as {session.displayName}</p>
        {!compact ? <p className="text-[var(--text-muted)]">{session.email}</p> : null}
        <button
          onClick={onLogout}
          className={`rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-1.5 font-normal text-[var(--text)] ${
            compact ? "mt-2 text-xs" : "mt-3"
          }`}
        >
          Sign out
        </button>
      </section>
    );
  }

  return (
    <section
      className={
        compact
          ? "rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-xs"
          : "rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 text-sm"
      }
    >
      {!compact ? (
        <h2 className="font-display text-base font-medium text-[var(--text)]">
          {mode === "signup" ? "Create account" : "Log in"}
        </h2>
      ) : null}
      {!compact ? (
        <p className="mb-2 mt-1 text-xs text-[var(--text-muted)]">
          Use email magic link if Supabase is configured, otherwise use quick local account mode.
        </p>
      ) : null}
      <div className={`grid gap-2 ${compact ? "sm:grid-cols-[140px_180px_auto_auto]" : ""}`}>
        <input
          placeholder={mode === "signup" ? "Display name" : "Name (optional)"}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--text)] placeholder:text-[var(--text-muted)]"
        />
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--text)] placeholder:text-[var(--text-muted)]"
          type="email"
        />
        <button
          onClick={() => onLocalLogin(email, displayName)}
          className="rounded-md bg-[var(--accent)] px-3 py-1.5 font-normal text-[var(--accent-foreground)]"
        >
          {mode === "signup" ? "Create account" : "Quick login"}
        </button>
        <button
          onClick={handleMagicLink}
          disabled={!supabase}
          className="rounded-md border border-[var(--border)] px-3 py-1.5 font-normal text-[var(--text)] disabled:opacity-50"
        >
          {compact ? "Magic link" : "Email magic link"}
        </button>
      </div>
      {message ? (
        <p className={`${compact ? "mt-1" : "mt-2"} text-xs text-[var(--gold)]`}>{message}</p>
      ) : null}
    </section>
  );
}
