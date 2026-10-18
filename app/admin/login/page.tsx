"use client";

import { FormEvent, useEffect, useState } from "react";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { LockKeyhole, Mail, LoaderCircle, ShieldCheck } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Kung naka-login na, dumiretso sa dashboard.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace("/admin/dashboard");
      } else {
        setCheckingAuth(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);

      router.replace("/admin/dashboard");
    } catch (err: unknown) {
      const errorCode =
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        typeof err.code === "string"
          ? err.code
          : "";

      switch (errorCode) {
        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found":
          setError("Invalid email or password. Please try again.");
          break;

        case "auth/invalid-email":
          setError("Please enter a valid email address.");
          break;

        case "auth/too-many-requests":
          setError(
            "Too many failed attempts. Please wait before trying again.",
          );
          break;

        case "auth/network-request-failed":
          setError(
            "Network error. Check your internet connection and try again.",
          );
          break;

        case "auth/user-disabled":
          setError("This account has been disabled.");
          break;

        default:
          setError("Unable to sign in. Please try again.");
          break;
      }
    } finally {
      setLoading(false);
    }
  }

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#09090d] text-white">
        <div className="text-center">
          <LoaderCircle
            size={32}
            className="mx-auto animate-spin text-fuchsia-500"
          />
          <p className="mt-4 text-sm text-zinc-400">
            Checking authentication...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#09090d] px-4 py-8 text-white">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#101016] p-7 shadow-2xl sm:p-9"
      >
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-400">
            <ShieldCheck size={28} />
          </div>

          <h1 className="text-3xl font-black">
            X<span className="text-fuchsia-500">Secrets</span>
          </h1>

          <p className="mt-2 text-sm text-zinc-400">Administrator sign in</p>
        </div>

        <label
          htmlFor="admin-email"
          className="mb-2 block text-sm text-zinc-300"
        >
          Email address
        </label>

        <div className="mb-5 flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-4 transition focus-within:border-fuchsia-500/50">
          <Mail size={18} className="shrink-0 text-zinc-500" />

          <input
            id="admin-email"
            name="email"
            type="email"
            autoComplete="username"
            required
            disabled={loading}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="admin@example.com"
            className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-zinc-600 disabled:opacity-60"
          />
        </div>

        <label
          htmlFor="admin-password"
          className="mb-2 block text-sm text-zinc-300"
        >
          Password
        </label>

        <div className="mb-5 flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-4 transition focus-within:border-fuchsia-500/50">
          <LockKeyhole size={18} className="shrink-0 text-zinc-500" />

          <input
            id="admin-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            disabled={loading}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-zinc-600 disabled:opacity-60"
          />
        </div>

        {error && (
          <p
            role="alert"
            aria-live="polite"
            className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-fuchsia-600 py-3.5 font-semibold transition hover:bg-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading && <LoaderCircle size={18} className="animate-spin" />}

          {loading ? "Signing in..." : "Sign in"}
        </button>

        <p className="mt-6 text-center text-xs text-zinc-500">
          Authorized administrators only
        </p>
      </form>
    </main>
  );
}
