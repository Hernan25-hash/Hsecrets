"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Heart, LoaderCircle } from "lucide-react";
import {
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useAuth } from "@/components/auth/AuthProvider";

interface VideoPlayerModalProps {
  videoId: string;
  embedUrl: string;
  title?: string;
  thumbnailUrl?: string;
  onClose: () => void;
}

export default function VideoPlayerModal({
  videoId,
  embedUrl,
  title = "Video Player",
  thumbnailUrl = "",
  onClose,
}: VideoPlayerModalProps) {
  const { user } = useAuth();

  const [isHearted, setIsHearted] = useState(false);
  const [heartLoading, setHeartLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [heartError, setHeartError] = useState("");

  const heartRef =
    user && videoId
      ? doc(db, "anonymous", user.uid, "heartedVideos", videoId)
      : null;

  useEffect(() => {
    if (!heartRef) {
      setIsHearted(false);
      setHeartLoading(false);
      return;
    }

    setHeartLoading(true);

    return onSnapshot(
      heartRef,
      (snapshot) => {
        setIsHearted(snapshot.exists());
        setHeartLoading(false);
      },
      (error) => {
        console.error("Failed to load liked video:", error);
        setHeartLoading(false);
        setHeartError("Couldn't load your like status.");
      },
    );
  }, [user?.uid, videoId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const toggleHeart = useCallback(async () => {
    if (!user || !heartRef || saving) {
      setHeartError("Please wait for your anonymous profile to load.");
      return;
    }

    setSaving(true);
    setHeartError("");

    try {
      if (isHearted) {
        await deleteDoc(heartRef);
        setIsHearted(false);
      } else {
        await setDoc(heartRef, {
          videoId,
          title,
          thumbnailUrl,
          videoUrl: embedUrl,
          createdAt: serverTimestamp(),
        });

        setIsHearted(true);
      }
    } catch (error) {
      console.error("Failed to update liked video:", error);
      setHeartError("Couldn't save your like. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [
    user,
    heartRef,
    saving,
    isHearted,
    videoId,
    title,
    thumbnailUrl,
    embedUrl,
  ]);

  if (!embedUrl) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/95 p-3 sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="relative w-full max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-[#111] shadow-2xl">
        {/* Back button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Go back to video collection"
          title="Back to collection"
          className="fixed left-3 top-3 z-[100] flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/70 text-white backdrop-blur-md transition hover:bg-white/20"
        >
          <ArrowLeft size={22} />
        </button>

        {/* Like video button */}
        <button
          type="button"
          onClick={() => void toggleHeart()}
          disabled={saving || heartLoading || !user}
          aria-label={isHearted ? "Unlike video" : "Like video"}
          aria-pressed={isHearted}
          title={isHearted ? "Remove from liked videos" : "Add to liked videos"}
          className="absolute right-3 top-3 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/75 text-white shadow-lg backdrop-blur-md transition hover:scale-105 hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving || heartLoading ? (
            <LoaderCircle size={22} className="animate-spin" />
          ) : (
            <Heart
              size={23}
              className={
                isHearted ? "fill-pink-500 text-pink-500" : "text-white"
              }
            />
          )}
        </button>

        {/* Video */}
        <div className="aspect-video w-full bg-black">
          <iframe
            src={embedUrl}
            title={title}
            className="h-full w-full"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>

        {heartError && (
          <p className="px-4 pb-3 text-xs text-red-400 sm:px-5" role="alert">
            {heartError}
          </p>
        )}
      </div>
    </div>
  );
}
