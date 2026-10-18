"use client";

import { FormEvent, useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import {
  UserPlus,
  Mail,
  LockKeyhole,
  LoaderCircle,
  ShieldCheck,
  Eye,
  EyeOff,
} from "lucide-react";

export default function AdminRegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (loading) return;

    if (displayName.trim().length < 2) {
      setError("Please enter your name.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedName = displayName.trim();

      // 1. Create Firebase Authentication account.
      const credential = await createUserWithEmailAndPassword(
        auth,
        normalizedEmail,
        password,
      );

      // 2. Update the Firebase Authentication profile.
      await updateProfile(credential.user, {
        displayName: normalizedName,
      });

      // 3. Save the user's profile in Firestore.
      // The document ID matches the Firebase Authentication UID.
      await setDoc(doc(db, "users", credential.user.uid), {
        uid: credential.user.uid,
        displayName: normalizedName,
        email: normalizedEmail,
        photoURL: credential.user.photoURL ?? "",
        role: "user",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 4. Redirect after the Firestore write succeeds.
      router.replace("/admin/login");
    } catch (err: unknown) {
      const code =
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        typeof err.code === "string"
          ? err.code
          : "";

      switch (code) {
        case "auth/email-already-in-use":
          setError("This email is already registered.");
          break;

        case "auth/invalid-email":
          setError("Please enter a valid email address.");
          break;

        case "auth/weak-password":
          setError("Please choose a stronger password.");
          break;

        case "auth/operation-not-allowed":
          setError(
            "Email registration is disabled. Enable Email/Password in Firebase Authentication settings.",
          );
          break;

        case "auth/network-request-failed":
          setError("Network error. Please check your internet connection.");
          break;

        case "permission-denied":
        case "firestore/permission-denied":
          setError(
            "Your account was created, but saving your profile was blocked by Firestore security rules. Please contact support.",
          );
          break;

        default:
          setError(
            "Unable to complete registration. Please try again. If your account was already created, try signing in.",
          );
          break;
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#09090d] px-4 py-8 text-white">
      <form
        onSubmit={handleRegister}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#101016] p-7 shadow-2xl sm:p-9"
      >
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-400">
            <ShieldCheck size={28} />
          </div>

          <h1 className="text-3xl font-black">
            X<span className="text-fuchsia-500">Secrets</span>
          </h1>

          <p className="mt-2 text-sm text-zinc-400">Create your account</p>
        </div>

        <label
          htmlFor="displayName"
          className="mb-2 block text-sm text-zinc-300"
        >
          Full name
        </label>

        <div className="mb-5 flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-4 focus-within:border-fuchsia-500/50">
          <UserPlus size={18} className="shrink-0 text-zinc-500" />

          <input
            id="displayName"
            name="displayName"
            type="text"
            autoComplete="name"
            required
            minLength={2}
            disabled={loading}
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Enter your full name"
            className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-zinc-600"
          />
        </div>

        <label htmlFor="email" className="mb-2 block text-sm text-zinc-300">
          Email address
        </label>

        <div className="mb-5 flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-4 focus-within:border-fuchsia-500/50">
          <Mail size={18} className="shrink-0 text-zinc-500" />

          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={loading}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-zinc-600"
          />
        </div>

        <label htmlFor="password" className="mb-2 block text-sm text-zinc-300">
          Password
        </label>

        <div className="mb-5 flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-4 focus-within:border-fuchsia-500/50">
          <LockKeyhole size={18} className="shrink-0 text-zinc-500" />

          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={8}
            disabled={loading}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
            className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-zinc-600"
          />

          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="shrink-0 text-zinc-500 hover:text-white"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <label
          htmlFor="confirmPassword"
          className="mb-2 block text-sm text-zinc-300"
        >
          Confirm password
        </label>

        <div className="mb-5 flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-4 focus-within:border-fuchsia-500/50">
          <LockKeyhole size={18} className="shrink-0 text-zinc-500" />

          <input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            disabled={loading}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Re-enter your password"
            className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-zinc-600"
          />

          <button
            type="button"
            onClick={() => setShowConfirmPassword((value) => !value)}
            className="shrink-0 text-zinc-500 hover:text-white"
            aria-label={
              showConfirmPassword
                ? "Hide confirm password"
                : "Show confirm password"
            }
          >
            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
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
          {loading ? (
            <>
              <LoaderCircle size={18} className="animate-spin" />
              Creating account...
            </>
          ) : (
            <>
              <UserPlus size={18} />
              Create account
            </>
          )}
        </button>

        <p className="mt-6 text-center text-sm text-zinc-400">
          Already have an account?{" "}
          <Link
            href="/admin/login"
            className="font-semibold text-fuchsia-400 hover:text-fuchsia-300"
          >
            Sign in
          </Link>
        </p>

        <p className="mt-5 text-center text-xs text-zinc-500">
          Account registration does not grant administrator privileges.
        </p>
      </form>
    </main>
  );
}
