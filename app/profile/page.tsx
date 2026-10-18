"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInAnonymously, type User } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import {
  ArrowLeft,
  Check,
  Heart,
  LoaderCircle,
  LogOut,
  RefreshCw,
  Save,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import Avatar from "boring-avatars";

import { useAuth } from "@/components/auth/AuthProvider";
import { auth, db } from "@/lib/firebase";

const COLORS = ["#7c3aed", "#a855f7", "#ec4899", "#f97316", "#facc15"];
const VARIANTS = ["beam", "marble", "pixel", "sunset", "ring"] as const;

type AvatarVariant = (typeof VARIANTS)[number];

interface Profile {
  displayName?: string;
  avatarSeed?: string;
  avatarVariant?: AvatarVariant;
}

interface HeartedVideo {
  id: string;
  videoId?: string;
  title?: string;
  thumbnailUrl?: string;
  videoUrl?: string;
}

export default function AnonymousProfilePage() {
  const router = useRouter();
  const { user: authUser, loading: authLoading } = useAuth();

  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("Anonymous");
  const [avatarSeed, setAvatarSeed] = useState("");
  const [avatarVariant, setAvatarVariant] = useState<AvatarVariant>("beam");

  const [heartedVideos, setHeartedVideos] = useState<HeartedVideo[]>([]);
  const [profileLoading, setProfileLoading] = useState(true);
  const [videosLoading, setVideosLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Reuse the existing Firebase session.
  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;

    async function ensureUser() {
      try {
        if (authUser) {
          if (!cancelled) setUser(authUser as User);
          return;
        }

        const credential = await signInAnonymously(auth);
        if (!cancelled) setUser(credential.user);
      } catch (err) {
        console.error("Authentication error:", err);
        if (!cancelled) {
          setError(
            "Hindi makapag-sign in. Check Firebase Anonymous Authentication.",
          );
          setProfileLoading(false);
          setVideosLoading(false);
        }
      }
    }

    void ensureUser();

    return () => {
      cancelled = true;
    };
  }, [authUser, authLoading]);

  // Shared profile document: anonymous/{uid}
  useEffect(() => {
    if (!user) return;

    setProfileLoading(true);

    const profileRef = doc(db, "anonymous", user.uid);

    const unsubscribe = onSnapshot(
      profileRef,
      async (snapshot) => {
        try {
          if (!snapshot.exists()) {
            await setDoc(
              profileRef,
              {
                uid: user.uid,
                displayName: "Anonymous",
                isAnonymous: user.isAnonymous,
                avatarSeed: user.uid,
                avatarVariant: "beam",
                createdAt: serverTimestamp(),
                lastSeen: serverTimestamp(),
              },
              { merge: true },
            );
            return;
          }

          const data = snapshot.data() as Profile;

          setDisplayName(data.displayName || "Anonymous");
          setAvatarSeed(data.avatarSeed || user.uid);

          if (VARIANTS.includes(data.avatarVariant as AvatarVariant)) {
            setAvatarVariant(data.avatarVariant as AvatarVariant);
          }

          setProfileLoading(false);
        } catch (err) {
          console.error("Profile error:", err);
          setError("Hindi ma-load ang profile. Check Firestore rules.");
          setProfileLoading(false);
        }
      },
      (err) => {
        console.error("Profile listener error:", err);
        setError("Hindi ma-access ang profile. Check Firestore rules.");
        setProfileLoading(false);
      },
    );

    return () => unsubscribe();
  }, [user]);

  // Hearted videos: anonymous/{uid}/heartedVideos/{videoId}
  useEffect(() => {
    if (!user) return;

    setVideosLoading(true);

    const videosRef = collection(db, "anonymous", user.uid, "heartedVideos");

    const videosQuery = query(videosRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      videosQuery,
      (snapshot) => {
        setHeartedVideos(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...(item.data() as Omit<HeartedVideo, "id">),
          })),
        );
        setVideosLoading(false);
      },
      (err) => {
        console.error("Hearted videos error:", err);
        setVideosLoading(false);
        setError("Hindi ma-load ang liked videos. Check Firestore rules.");
      },
    );

    return () => unsubscribe();
  }, [user]);

  async function saveProfile() {
    if (!user || saving) return;

    setSaving(true);
    setMessage("");
    setError("");

    try {
      await setDoc(
        doc(db, "anonymous", user.uid),
        {
          uid: user.uid,
          displayName: displayName.trim().slice(0, 30) || "Anonymous",
          isAnonymous: user.isAnonymous,
          avatarSeed: avatarSeed || user.uid,
          avatarVariant,
          lastSeen: serverTimestamp(),
        },
        { merge: true },
      );

      setMessage("Profile updated.");
      setEditing(false);
    } catch (err) {
      console.error("Save profile error:", err);
      setError("Hindi na-save ang profile. Check Firestore rules.");
    } finally {
      setSaving(false);
    }
  }

  async function removeHeartedVideo(videoId: string) {
    if (!user) return;

    try {
      await deleteDoc(doc(db, "anonymous", user.uid, "heartedVideos", videoId));
    } catch (err) {
      console.error("Remove heart error:", err);
      setError("Hindi maalis ang video sa liked list.");
    }
  }

  function randomizeAvatar() {
    setAvatarSeed(`${user?.uid || "anonymous"}-${Date.now()}`);
    setMessage("");
  }

  if (authLoading || profileLoading || !user) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#09070d] text-white">
        <div className="flex items-center gap-3 text-sm text-white/60">
          <LoaderCircle className="size-5 animate-spin text-violet-400" />
          Loading profile...
        </div>
        {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#09070d] px-4 py-6 text-white sm:px-6">
      <div className="mx-auto max-w-4xl">
        {/* Navigation */}
        <div className="mb-7 flex items-center justify-between">
          {/* Fixed Back Button — Upper Left */}
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Go back"
            className="fixed left-4 top-4 z-50 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#121019]/95 px-3 py-2 text-sm text-white/80 shadow-lg backdrop-blur-md transition hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="size-4" />
            Back
          </button>

          <span className="text-xs font-medium text-white/35">XSECRETS</span>
        </div>

        {/* Compact profile card */}
        <section className="rounded-3xl border border-white/10 bg-[#121019] p-5 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="size-24 shrink-0 overflow-hidden rounded-2xl border border-violet-400/20 bg-[#21172e]">
              <Avatar
                size="100%"
                name={avatarSeed || user.uid}
                variant={avatarVariant}
                colors={COLORS}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h1 className="max-w-full break-words text-2xl font-bold">
                  {displayName || "Anonymous"}
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full border border-violet-400/20 bg-violet-500/10 px-2 py-1 text-[11px] text-violet-200">
                  {user.isAnonymous ? (
                    <UserRound className="size-3" />
                  ) : (
                    <ShieldCheck className="size-3" />
                  )}
                  {user.isAnonymous ? "Anonymous" : "Member"}
                </span>
              </div>

              <p className="text-sm text-white/45">
                Your identity, your favorites.
              </p>

              <button
                onClick={() => {
                  setEditing(!editing);
                  setMessage("");
                }}
                className="mt-4 rounded-xl bg-white/[0.07] px-4 py-2 text-sm font-medium transition hover:bg-white/[0.12]"
              >
                {editing ? "Cancel editing" : "Edit profile"}
              </button>
            </div>
          </div>

          {editing && (
            <div className="mt-7 space-y-5 border-t border-white/[0.08] pt-6">
              <div>
                <label
                  htmlFor="displayName"
                  className="mb-2 block text-sm font-medium text-white/75"
                >
                  Display name
                </label>
                <input
                  id="displayName"
                  value={displayName}
                  maxLength={30}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Your display name"
                  className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm outline-none transition focus:border-violet-400/60"
                />
                <p className="mt-1 text-right text-xs text-white/30">
                  {displayName.length}/30
                </p>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium text-white/75">
                    Avatar style
                  </p>
                  <button
                    onClick={randomizeAvatar}
                    className="inline-flex items-center gap-1.5 text-xs text-violet-300 hover:text-violet-200"
                  >
                    <RefreshCw className="size-3.5" />
                    Randomize
                  </button>
                </div>

                <div className="flex flex-wrap gap-3">
                  {VARIANTS.map((variant) => (
                    <button
                      key={variant}
                      onClick={() => {
                        setAvatarVariant(variant);
                        setMessage("");
                      }}
                      aria-label={`Choose ${variant} avatar`}
                      aria-pressed={avatarVariant === variant}
                      className={`rounded-xl border p-2 transition ${
                        avatarVariant === variant
                          ? "border-violet-400 bg-violet-500/10"
                          : "border-white/10 hover:border-white/30"
                      }`}
                    >
                      <Avatar
                        size={48}
                        name={avatarSeed || user.uid}
                        variant={variant}
                        colors={COLORS}
                      />
                      <span className="mt-1 block text-[10px] capitalize text-white/60">
                        {variant}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={saveProfile}
                disabled={saving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold transition hover:bg-violet-500 disabled:opacity-50 sm:w-auto"
              >
                {saving ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          )}

          {message && (
            <p className="mt-4 flex items-center gap-2 text-sm text-emerald-300">
              <Check className="size-4" />
              {message}
            </p>
          )}
          {error && (
            <p role="alert" className="mt-4 text-sm text-rose-300">
              {error}
            </p>
          )}
        </section>

        {/* Hearted videos */}
        <section className="mt-7">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-bold">
                <Heart className="size-5 fill-pink-500 text-pink-500" />
                Hearted videos
              </h2>
              <p className="mt-1 text-sm text-white/40">
                Videos you liked and want to watch again.
              </p>
            </div>

            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/60">
              {heartedVideos.length} saved
            </span>
          </div>

          {videosLoading ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[#121019] p-10 text-sm text-white/45">
              <LoaderCircle className="size-4 animate-spin" />
              Loading liked videos...
            </div>
          ) : heartedVideos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-[#121019] px-5 py-12 text-center">
              <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-pink-500/10">
                <Heart className="size-5 text-pink-400" />
              </div>
              <h3 className="font-semibold">No liked videos yet</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-white/40">
                When you tap the heart on a video, it will appear here.
              </p>
              <Link
                href="/"
                className="mt-5 inline-flex rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold transition hover:bg-violet-500"
              >
                Explore videos
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {heartedVideos.map((video) => (
                <article
                  key={video.id}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-[#121019] transition hover:border-violet-400/30"
                >
                  <div className="relative aspect-video bg-white/[0.04]">
                    {video.thumbnailUrl ? (
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title || "Liked video"}
                        loading="lazy"
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="grid size-full place-items-center text-white/25">
                        <Heart className="size-8" />
                      </div>
                    )}

                    <button
                      onClick={() => removeHeartedVideo(video.id)}
                      aria-label="Remove from liked videos"
                      title="Remove from liked videos"
                      className="absolute right-3 top-3 grid size-9 place-items-center rounded-full border border-white/10 bg-black/70 text-pink-400 backdrop-blur transition hover:bg-rose-600 hover:text-white"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  <div className="p-4">
                    {video.videoUrl ? (
                      <a
                        href={video.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex text-xs font-semibold text-violet-300 hover:text-violet-200"
                      >
                        Watch video ↗
                      </a>
                    ) : (
                      <p className="mt-3 text-xs text-white/35">
                        Video link unavailable
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <p className="mt-8 text-center text-xs text-white/25">
          XSecrets · Your profile, your favorites.
        </p>
      </div>
    </main>
  );
}
