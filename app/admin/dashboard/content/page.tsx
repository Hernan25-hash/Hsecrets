"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Clapperboard,
  Edit2,
  ExternalLink,
  Film,
  LoaderCircle,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { auth, db } from "@/lib/firebase";

type ContentStatus = "Draft" | "Published" | "Archived";
type ContentType = "Uncensored" | "Censored";
type ContentTypeFilter = "All" | ContentType;

type VideoItem = {
  id: string;
  embedUrl: string;
  thumbnailUrl: string;
  status: ContentStatus;
  contentType: ContentType;
  createdAt: string;
  updatedAt: string;
};

type VideoForm = {
  embedUrl: string;
  thumbnailUrl: string;
  status: ContentStatus;
  contentType: ContentType;
};

const DEFAULT_THUMBNAIL_URL =
  "https://javtiful.com/uploads/uploads/videos/thumbs/2026/08/14/5313d7c995823cbd2d8c0165cdb4a465.jpg";

const emptyForm: VideoForm = {
  embedUrl: "",
  thumbnailUrl: "",
  status: "Draft",
  contentType: "Censored",
};

function getEmbedUrl(value: string): string {
  const input = value.trim();

  if (!input) return "";

  // Accept a direct embed URL or a complete iframe snippet.
  const srcMatch = input.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
  const candidate = (srcMatch?.[1] ?? input).trim();

  try {
    const url = new URL(candidate);

    if (
      url.protocol !== "https:" ||
      url.hostname !== "javtiful.com" ||
      !url.pathname.startsWith("/embed/")
    ) {
      return "";
    }

    return url.href;
  } catch {
    return "";
  }
}

function getThumbnailUrl(value: string): string {
  const input = value.trim();

  if (!input) return "";

  try {
    const url = new URL(input);

    if (url.protocol !== "https:") return "";

    return url.href;
  } catch {
    return "";
  }
}

function toDateString(value: unknown): string {
  if (typeof value === "string") return value;

  if (!value || typeof value !== "object") return "";

  const timestamp = value as { toDate?: () => Date };

  if (typeof timestamp.toDate !== "function") return "";

  try {
    const date = timestamp.toDate();

    return date instanceof Date && !Number.isNaN(date.getTime())
      ? date.toISOString()
      : "";
  } catch {
    return "";
  }
}

function formatDate(value: string): string {
  if (!value) return "Just now";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Unknown date";

  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getFirebaseErrorMessage(error: unknown): string {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : "";

  switch (code) {
    case "permission-denied":
    case "firestore/permission-denied":
      return "Access denied. Tingnan ang Firestore Security Rules para sa users/{uid}/videos.";

    case "unavailable":
    case "firestore/unavailable":
      return "Hindi maabot ang Firestore. Suriin ang internet connection.";

    case "unauthenticated":
    case "firestore/unauthenticated":
      return "Nag-expire ang session mo. Mag-sign in ulit.";

    default:
      return "Hindi makumpleto ang request. Subukan ulit.";
  }
}

export default function ContentManagementPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [items, setItems] = useState<VideoItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"All" | ContentStatus>("All");

  // Separate filter for Censored / Uncensored videos.
  const [contentTypeFilter, setContentTypeFilter] =
    useState<ContentTypeFilter>("All");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<VideoForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [pageError, setPageError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Require a valid Firebase Authentication session.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthChecked(true);

      if (!currentUser) {
        router.replace("/admin/login");
      }
    });

    return unsubscribe;
  }, [router]);

  // Load only the signed-in user's videos.
  useEffect(() => {
    if (!authChecked || !user) return;

    setLoaded(false);
    setPageError("");

    const videosRef = collection(db, "users", user.uid, "videos");
    const videosQuery = query(videosRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      videosQuery,
      (snapshot) => {
        const records: VideoItem[] = snapshot.docs.map((videoDoc) => {
          const data = videoDoc.data();

          const rawStatus = data.status;
          const status: ContentStatus =
            rawStatus === "Published" ||
            rawStatus === "Archived" ||
            rawStatus === "Draft"
              ? rawStatus
              : "Draft";

          // Legacy records without contentType default to Censored.
          const contentType: ContentType =
            data.contentType === "Uncensored" || data.contentType === "Censored"
              ? data.contentType
              : "Censored";

          return {
            id: videoDoc.id,
            embedUrl: typeof data.embedUrl === "string" ? data.embedUrl : "",
            thumbnailUrl:
              typeof data.thumbnailUrl === "string" ? data.thumbnailUrl : "",
            status,
            contentType,
            createdAt: toDateString(data.createdAt),
            updatedAt: toDateString(data.updatedAt),
          };
        });

        setItems(records);
        setLoaded(true);
      },
      (error) => {
        console.error("Failed to load video records:", error);
        setPageError(getFirebaseErrorMessage(error));
        setLoaded(true);
      },
    );

    return unsubscribe;
  }, [authChecked, user]);

  // Apply search, status, and content-type filters together.
  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesSearch =
        item.embedUrl.toLowerCase().includes(term) ||
        item.thumbnailUrl.toLowerCase().includes(term);

      const matchesStatus = filter === "All" || item.status === filter;

      const matchesContentType =
        contentTypeFilter === "All" || item.contentType === contentTypeFilter;

      return matchesSearch && matchesStatus && matchesContentType;
    });
  }, [items, search, filter, contentTypeFilter]);

  const publishedCount = items.filter(
    (item) => item.status === "Published",
  ).length;

  const draftCount = items.filter((item) => item.status === "Draft").length;

  const censoredCount = items.filter(
    (item) => item.contentType === "Censored",
  ).length;

  const uncensoredCount = items.filter(
    (item) => item.contentType === "Uncensored",
  ).length;

  const updateForm = <K extends keyof VideoForm>(
    field: K,
    value: VideoForm[K],
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const openCreateModal = () => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      thumbnailUrl: DEFAULT_THUMBNAIL_URL,
    });
    setFormError("");
    setModalOpen(true);
  };

  const openEditModal = (item: VideoItem) => {
    setEditingId(item.id);

    setForm({
      embedUrl: item.embedUrl,
      thumbnailUrl: item.thumbnailUrl,
      status: item.status,
      contentType: item.contentType,
    });

    setFormError("");
    setModalOpen(true);
  };

  const saveContent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    if (!user) {
      setFormError("Mag-sign in muna bago mag-save.");
      return;
    }

    if (saving) return;

    const embedUrl = getEmbedUrl(form.embedUrl);

    if (!embedUrl) {
      setFormError(
        "I-paste ang valid na HTTPS Javtiful embed URL o ang buong iframe code.",
      );
      return;
    }

    const rawThumbnailUrl = form.thumbnailUrl.trim();
    const thumbnailUrl = getThumbnailUrl(rawThumbnailUrl);

    if (rawThumbnailUrl && !thumbnailUrl) {
      setFormError(
        "Hindi valid ang thumbnail URL. Gumamit ng HTTPS image link.",
      );
      return;
    }

    setSaving(true);

    try {
      const videosRef = collection(db, "users", user.uid, "videos");

      if (editingId) {
        await updateDoc(doc(videosRef, editingId), {
          embedUrl,
          thumbnailUrl,
          status: form.status,
          contentType: form.contentType,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(videosRef, {
          embedUrl,
          thumbnailUrl,
          status: form.status,
          contentType: form.contentType,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      setModalOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      setFormError("");
    } catch (error: unknown) {
      console.error("Failed to save video:", error);
      setFormError(getFirebaseErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const deleteContent = async (id: string) => {
    if (!user || deletingId) return;

    setDeletingId(id);

    try {
      setPageError("");
      await deleteDoc(doc(db, "users", user.uid, "videos", id));
      setConfirmDelete(null);
    } catch (error: unknown) {
      console.error("Failed to delete video:", error);
      setPageError(getFirebaseErrorMessage(error));
      setConfirmDelete(null);
    } finally {
      setDeletingId(null);
    }
  };

  const updateStatus = async (id: string, status: ContentStatus) => {
    if (!user) return;

    try {
      setPageError("");

      await updateDoc(doc(db, "users", user.uid, "videos", id), {
        status,
        updatedAt: serverTimestamp(),
      });
    } catch (error: unknown) {
      console.error("Failed to update video status:", error);
      setPageError(getFirebaseErrorMessage(error));
    }
  };

  if (!authChecked || (user && !loaded)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#09090d] text-white">
        <div className="flex items-center gap-3 text-sm text-zinc-400">
          <LoaderCircle className="animate-spin" size={22} />
          Checking account and loading videos...
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#09090d] text-white">
        <LoaderCircle className="animate-spin" size={22} />
        <span className="ml-3 text-sm text-zinc-400">
          Redirecting to sign in...
        </span>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#09090d] text-white">
      <div className="mx-auto max-w-[1500px] space-y-7 p-4 sm:p-7 lg:p-9">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <a
              href="/admin/dashboard"
              className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
            >
              <ArrowLeft size={16} />
              Back to dashboard
            </a>

            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/10 p-3 text-fuchsia-300">
                <Clapperboard size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                  Video Management
                </h1>
                <p className="mt-1 text-sm text-zinc-500">
                  Manage your saved embed links and thumbnails.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-fuchsia-600 px-5 py-3 text-sm font-semibold transition hover:bg-fuchsia-500"
          >
            <Plus size={18} />
            Add Video
          </button>
        </header>

        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-emerald-400" />
          <div>
            <p className="text-sm font-semibold text-emerald-300">
              Signed in as {user.email ?? user.uid}
            </p>
            <p className="mt-1 text-xs leading-5 text-zinc-400">
              Ang videos ay ise-save sa sarili mong Firestore users/{user.uid}
              /videos collection.
            </p>
          </div>
        </div>

        {pageError && (
          <p
            role="alert"
            className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300"
          >
            {pageError}
          </p>
        )}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Total Videos",
              value: items.length,
              icon: Film,
              color: "text-fuchsia-300",
            },
            {
              label: "Published",
              value: publishedCount,
              icon: Check,
              color: "text-emerald-400",
            },
            {
              label: "Censored",
              value: censoredCount,
              icon: ShieldCheck,
              color: "text-sky-400",
            },
            {
              label: "Uncensored",
              value: uncensoredCount,
              icon: Clapperboard,
              color: "text-rose-400",
            },
          ].map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/10 bg-[#101016] p-5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">{stat.label}</span>
                  <Icon size={19} className={stat.color} />
                </div>
                <p className="mt-4 text-3xl font-black">{stat.value}</p>
              </div>
            );
          })}
        </section>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#101016]">
          <div className="flex flex-col gap-4 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold">Saved Videos</h2>
              <p className="mt-1 text-sm text-zinc-500">
                {filteredItems.length} result
                {filteredItems.length === 1 ? "" : "s"}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <div className="relative">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search embed or thumbnail URL..."
                  className="w-full rounded-xl border border-white/10 bg-[#09090d] py-2.5 pl-10 pr-3 text-sm outline-none focus:border-fuchsia-500/50 sm:w-64"
                  aria-label="Search videos"
                />
              </div>

              <div className="relative">
                <select
                  value={filter}
                  onChange={(event) =>
                    setFilter(event.target.value as "All" | ContentStatus)
                  }
                  className="w-full appearance-none rounded-xl border border-white/10 bg-[#09090d] py-2.5 pl-3 pr-9 text-sm outline-none focus:border-fuchsia-500/50 sm:w-40"
                  aria-label="Filter by status"
                >
                  <option value="All">All statuses</option>
                  <option value="Published">Published</option>
                  <option value="Draft">Draft</option>
                  <option value="Archived">Archived</option>
                </select>
                <ChevronDown
                  size={15}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
                />
              </div>

              <div className="relative">
                <select
                  value={contentTypeFilter}
                  onChange={(event) =>
                    setContentTypeFilter(
                      event.target.value as ContentTypeFilter,
                    )
                  }
                  className="w-full appearance-none rounded-xl border border-white/10 bg-[#09090d] py-2.5 pl-3 pr-9 text-sm outline-none focus:border-fuchsia-500/50 sm:w-44"
                  aria-label="Filter by content type"
                >
                  <option value="All">All content types</option>
                  <option value="Censored">Censored</option>
                  <option value="Uncensored">Uncensored</option>
                </select>
                <ChevronDown
                  size={15}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
                />
              </div>
            </div>
          </div>

          {!loaded ? (
            <div className="flex justify-center py-20 text-zinc-500">
              <LoaderCircle className="animate-spin" size={24} />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center px-5 py-16 text-center">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-zinc-500">
                <Film size={30} />
              </div>
              <h3 className="mt-5 font-bold">
                {items.length === 0 ? "No videos yet" : "No matching videos"}
              </h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500">
                {items.length === 0
                  ? "Click Add Video and paste an embed link to get started."
                  : "Try another search term, status filter, or content type."}
              </p>

              {items.length === 0 && (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-fuchsia-600 px-4 py-2.5 text-sm font-semibold hover:bg-fuchsia-500"
                >
                  <Plus size={17} />
                  Add your first video
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {filteredItems.map((item) => (
                <article
                  key={item.id}
                  className="flex flex-col gap-4 p-4 transition hover:bg-white/[0.02] sm:flex-row sm:items-center sm:p-5"
                >
                  <div className="flex h-24 w-full shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[#09090d] text-fuchsia-300 sm:w-36">
                    {item.thumbnailUrl ? (
                      <img
                        src={item.thumbnailUrl}
                        alt="Video thumbnail"
                        loading="lazy"
                        className="h-full w-full object-cover"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <Film size={30} />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold">Video embed</h3>

                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                          item.status === "Published"
                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                            : item.status === "Draft"
                              ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
                              : "border-zinc-500/20 bg-zinc-500/10 text-zinc-400"
                        }`}
                      >
                        {item.status}
                      </span>

                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                          item.contentType === "Uncensored"
                            ? "border-rose-500/20 bg-rose-500/10 text-rose-300"
                            : "border-sky-500/20 bg-sky-500/10 text-sky-300"
                        }`}
                      >
                        {item.contentType}
                      </span>
                    </div>

                    <p className="mt-2 break-all text-sm text-zinc-400">
                      {item.embedUrl}
                    </p>

                    {item.thumbnailUrl && (
                      <p className="mt-2 break-all text-xs text-zinc-500">
                        Thumbnail: {item.thumbnailUrl}
                      </p>
                    )}

                    <p className="mt-2 text-xs text-zinc-500">
                      Added {formatDate(item.createdAt)}
                    </p>

                    <a
                      href={item.embedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 text-xs text-fuchsia-300 hover:text-fuchsia-200"
                    >
                      <ExternalLink size={13} />
                      Open embed link
                    </a>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <label className="sr-only" htmlFor={`status-${item.id}`}>
                      Video status
                    </label>
                    <select
                      id={`status-${item.id}`}
                      value={item.status}
                      onChange={(event) =>
                        updateStatus(
                          item.id,
                          event.target.value as ContentStatus,
                        )
                      }
                      className="min-w-28 rounded-lg border border-white/10 bg-[#09090d] px-2 py-2 text-xs outline-none focus:border-fuchsia-500/50"
                    >
                      <option value="Draft">Draft</option>
                      <option value="Published">Published</option>
                      <option value="Archived">Archived</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      className="rounded-lg border border-white/10 p-2.5 text-zinc-400 hover:border-fuchsia-500/30 hover:text-fuchsia-300"
                      aria-label="Edit video"
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setConfirmDelete(item.id)}
                      className="rounded-lg border border-white/10 p-2.5 text-zinc-400 hover:border-red-500/30 hover:text-red-400"
                      aria-label="Delete video"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="pb-4 text-center text-xs text-zinc-600">
          XSecrets · Video Management
        </footer>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setModalOpen(false);
            }
          }}
        >
          <form
            onSubmit={saveContent}
            className="my-auto max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-white/10 bg-[#111117] p-5 shadow-2xl sm:rounded-2xl sm:p-7"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black">
                  {editingId ? "Edit Video" : "Add Video"}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Add an embed link and an optional thumbnail image URL.
                </p>
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-white/10 p-2 text-zinc-400 hover:text-white disabled:opacity-50"
                aria-label="Close modal"
              >
                <X size={19} />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Embed link <span className="text-fuchsia-400">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={form.embedUrl}
                  disabled={saving}
                  onChange={(event) =>
                    updateForm("embedUrl", event.target.value)
                  }
                  placeholder={`https://javtiful.com/embed/114733

or paste the complete <iframe ...> code`}
                  className="w-full resize-y rounded-xl border border-white/10 bg-[#09090d] px-4 py-3 text-sm outline-none focus:border-fuchsia-500/50 disabled:opacity-60"
                />
                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  Isang embed link lang ang kailangan. Awtomatikong kinukuha ang
                  src mula sa iframe code; hindi sine-save ang buong HTML.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Thumbnail Image URL
                </label>
                <input
                  type="url"
                  value={form.thumbnailUrl}
                  disabled={saving}
                  onChange={(event) =>
                    updateForm("thumbnailUrl", event.target.value)
                  }
                  placeholder={DEFAULT_THUMBNAIL_URL}
                  className="w-full rounded-xl border border-white/10 bg-[#09090d] px-4 py-3 text-sm outline-none focus:border-fuchsia-500/50 disabled:opacity-60"
                />
                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  Optional. I-paste ang direct HTTPS image URL. May default
                  thumbnail link para sa bagong video; puwede mo itong palitan o
                  burahin.
                </p>

                {form.thumbnailUrl.trim() && (
                  <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-[#09090d]">
                    <div className="border-b border-white/10 px-3 py-2 text-xs text-zinc-400">
                      Thumbnail Preview
                    </div>
                    <img
                      src={form.thumbnailUrl}
                      alt="Video thumbnail preview"
                      className="aspect-video w-full object-cover"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                      onLoad={(event) => {
                        event.currentTarget.style.display = "block";
                      }}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Status</label>
                <select
                  value={form.status}
                  disabled={saving}
                  onChange={(event) =>
                    updateForm("status", event.target.value as ContentStatus)
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#09090d] px-4 py-3 text-sm outline-none focus:border-fuchsia-500/50 disabled:opacity-60"
                >
                  <option value="Draft">Draft</option>
                  <option value="Published">Published</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Content Type
                </label>
                <select
                  value={form.contentType}
                  disabled={saving}
                  onChange={(event) =>
                    updateForm("contentType", event.target.value as ContentType)
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#09090d] px-4 py-3 text-sm outline-none focus:border-fuchsia-500/50 disabled:opacity-60"
                >
                  <option value="Censored">Censored</option>
                  <option value="Uncensored">Uncensored</option>
                </select>
                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  Piliin ang tamang content type. Nasesave ito sa Firestore at
                  ginagamit din sa list filter.
                </p>
              </div>
            </div>

            {formError && (
              <p
                role="alert"
                className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300"
              >
                {formError}
              </p>
            )}

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={saving}
                onClick={() => setModalOpen(false)}
                className="rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-zinc-300 hover:bg-white/5 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-fuchsia-600 px-5 py-3 text-sm font-semibold hover:bg-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <LoaderCircle size={17} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check size={17} />
                    {editingId ? "Save Changes" : "Save Video"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111117] p-6 shadow-2xl">
            <div className="mb-4 inline-flex rounded-xl bg-red-500/10 p-3 text-red-400">
              <Trash2 size={22} />
            </div>
            <h2 className="text-lg font-bold">Delete this video?</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Permanenteng tatanggalin ang embed record na ito sa iyong
              Firestore videos subcollection.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={deletingId !== null}
                onClick={() => setConfirmDelete(null)}
                className="rounded-xl border border-white/10 px-4 py-2.5 text-sm hover:bg-white/5 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingId !== null}
                onClick={() => void deleteContent(confirmDelete)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingId === confirmDelete && (
                  <LoaderCircle size={15} className="animate-spin" />
                )}
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
