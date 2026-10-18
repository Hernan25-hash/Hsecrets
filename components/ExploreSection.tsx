"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/components/auth/AuthProvider";
import { ChevronLeft, ChevronRight, Play, Search } from "lucide-react";
import VideoPlayerModal from "@/components/VideoPlayerModal";

type VideoItem = {
  id: string;
  title: string;
  category: string;
  duration: string;
  tone: string;
  badge: string;
  views: string;
  embedUrl: string;
  videoUrl: string;
  thumbnailUrl: string;
  status: string;
  contentType: string;
  createdAt: number;
};

const filters = ["All", "Uncensored", "Censored"] as const;

const DATE_FILTERS = [
  { label: "Any time", value: "all" },
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "Last 7 days", value: "week" },
  { label: "This month", value: "month" },
] as const;

const SORT_OPTIONS = [
  { label: "Newest first", value: "newest" },
  { label: "Oldest first", value: "oldest" },
] as const;

const VIDEOS_PER_PAGE = 9;

// Existing Firebase video owner. Kept unchanged.
const VIDEO_OWNER_UID = "VAQZCE8Q4DWGBzbRQfJHHbtwp602";

type DateFilter = (typeof DATE_FILTERS)[number]["value"];
type SortOrder = (typeof SORT_OPTIONS)[number]["value"];
type CategoryFilter = (typeof filters)[number];

function getTimestamp(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  if (value && typeof value === "object") {
    const timestamp = value as {
      toMillis?: () => number;
      seconds?: number;
      _seconds?: number;
    };

    if (typeof timestamp.toMillis === "function") {
      return timestamp.toMillis();
    }

    if (typeof timestamp.seconds === "number") {
      return timestamp.seconds * 1000;
    }

    if (typeof timestamp._seconds === "number") {
      return timestamp._seconds * 1000;
    }
  }

  return 0;
}

function getContentType(data: Record<string, unknown>): string {
  const rawType =
    data.contentType ??
    data.contentRating ??
    data.classification ??
    data.rating;

  if (typeof rawType === "string" && rawType.trim()) {
    return rawType.trim().toLowerCase();
  }

  if (data.isUncensored === true) return "uncensored";
  if (data.isCensored === true) return "censored";

  // Default for documents without a classification field.
  return "censored";
}

function isUncensored(video: VideoItem): boolean {
  const type = video.contentType.replace(/[\s_-]/g, "");

  return ["uncensored", "18+", "adult", "explicit"].includes(type);
}

function ContentCard({ item }: { item: VideoItem }) {
  const [showPlayer, setShowPlayer] = useState(false);
  const playerUrl = item.embedUrl || item.videoUrl;

  useEffect(() => {
    if (!showPlayer) return;

    document.body.classList.add("video-player-open");

    return () => {
      document.body.classList.remove("video-player-open");
    };
  }, [showPlayer]);

  const openPlayer = () => {
    if (playerUrl) setShowPlayer(true);
  };

  return (
    <>
      <article
        className={`content-card tone-${item.tone}`}
        role={playerUrl ? "button" : undefined}
        tabIndex={playerUrl ? 0 : undefined}
        aria-label={playerUrl ? `Play ${item.title}` : undefined}
        onClick={openPlayer}
        onKeyDown={(event) => {
          if (playerUrl && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            openPlayer();
          }
        }}
      >
        <div className="card-art">
          {item.thumbnailUrl ? (
            <img
              src={item.thumbnailUrl}
              alt={item.title}
              className="video-thumbnail"
              loading="lazy"
            />
          ) : (
            <>
              <div className="art-orb" />
              <div className="art-line" />
            </>
          )}

          <span className="art-label">{item.category}</span>

          {item.badge && <span className="card-badge">{item.badge}</span>}

          {playerUrl && (
            <button
              className="play-button"
              type="button"
              aria-label={`Play ${item.title}`}
              onClick={(event) => {
                event.stopPropagation();
                openPlayer();
              }}
            >
              <Play size={15} fill="currentColor" />
            </button>
          )}

          <div className="card-shade" />
        </div>
      </article>

      {showPlayer && playerUrl && (
        <VideoPlayerModal
          videoId={item.id}
          embedUrl={playerUrl}
          title={item.title}
          thumbnailUrl={item.thumbnailUrl}
          onClose={() => setShowPlayer(false)}
        />
      )}
    </>
  );
}

export default function ExploreSection() {
  const { user, loading: authLoading } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("All");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load videos from the existing owner collection.
  useEffect(() => {
    if (!mounted || authLoading) return;

    if (!user) {
      setVideos([]);
      setLoading(false);
      setError("Please sign in to view the video collection.");
      return;
    }

    setLoading(true);
    setError("");

    const videosQuery = query(
      collection(db, "users", VIDEO_OWNER_UID, "videos"),
    );

    const unsubscribe = onSnapshot(
      videosQuery,
      (snapshot) => {
        const results: VideoItem[] = snapshot.docs
          .map((document) => {
            const data = document.data();

            return {
              id: document.id,
              title: String(data.title || "Untitled video"),
              category: String(data.category || "Popular"),
              duration: String(data.duration || ""),
              tone: String(data.tone || "violet"),
              badge: String(data.badge || ""),
              views: String(data.views || "Featured selection"),
              embedUrl: String(data.embedUrl || ""),
              videoUrl: String(data.videoUrl || data.url || ""),
              thumbnailUrl: String(data.thumbnailUrl || data.thumbnail || ""),
              status: String(data.status || "")
                .trim()
                .toLowerCase(),
              contentType: getContentType(data),
              createdAt: getTimestamp(
                data.createdAt ?? data.uploadedAt ?? data.publishedAt,
              ),
            };
          })
          .filter((video) => video.status === "published");

        setVideos(results);
        setLoading(false);
        setError("");

        console.log("Videos found in owner collection:", snapshot.size);
        console.log("Published videos:", results.length);
      },
      (err) => {
        console.error("Explore Firestore error:", err.code, err.message);
        setError(`${err.code}: ${err.message}`);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [mounted, user, authLoading]);

  // Search, content classification, date filtering and sorting.
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const now = new Date();

    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).getTime();

    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
    const startOfWeek = startOfToday - 6 * 24 * 60 * 60 * 1000;
    const startOfMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
    ).getTime();

    return videos
      .filter((video) => {
        const matchesSearch = video.title.toLowerCase().includes(term);

        const matchesCategory =
          category === "All" ||
          (category === "Uncensored" && isUncensored(video)) ||
          (category === "Censored" && !isUncensored(video));

        let matchesDate = true;

        if (dateFilter === "today") {
          matchesDate =
            video.createdAt >= startOfToday &&
            video.createdAt < startOfToday + 24 * 60 * 60 * 1000;
        } else if (dateFilter === "yesterday") {
          matchesDate =
            video.createdAt >= startOfYesterday &&
            video.createdAt < startOfToday;
        } else if (dateFilter === "week") {
          matchesDate =
            video.createdAt >= startOfWeek &&
            video.createdAt < startOfToday + 24 * 60 * 60 * 1000;
        } else if (dateFilter === "month") {
          matchesDate =
            video.createdAt >= startOfMonth &&
            video.createdAt < startOfToday + 24 * 60 * 60 * 1000;
        }

        return matchesSearch && matchesCategory && matchesDate;
      })
      .sort((a, b) =>
        sortOrder === "newest"
          ? b.createdAt - a.createdAt
          : a.createdAt - b.createdAt,
      );
  }, [videos, search, category, dateFilter, sortOrder]);

  const totalPages = Math.ceil(filtered.length / VIDEOS_PER_PAGE);

  const paginatedVideos = useMemo(() => {
    const startIndex = (currentPage - 1) * VIDEOS_PER_PAGE;
    return filtered.slice(startIndex, startIndex + VIDEOS_PER_PAGE);
  }, [filtered, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, category, dateFilter, sortOrder]);

  useEffect(() => {
    if (totalPages === 0 && currentPage !== 1) {
      setCurrentPage(1);
    } else if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;

    setCurrentPage(page);

    document.getElementById("explore")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const pages = new Set<number>([
      1,
      totalPages,
      currentPage,
      currentPage - 1,
      currentPage + 1,
    ]);

    if (currentPage <= 3) {
      pages.add(2);
      pages.add(3);
      pages.add(4);
    }

    if (currentPage >= totalPages - 2) {
      pages.add(totalPages - 1);
      pages.add(totalPages - 2);
      pages.add(totalPages - 3);
    }

    return Array.from(pages)
      .filter((page) => page >= 1 && page <= totalPages)
      .sort((a, b) => a - b);
  }, [totalPages, currentPage]);

  let previousPageNumber = 0;

  return (
    <section className="section explore-section" id="explore">
      <div className="section-heading explore-heading">
        <div>
          <p className="eyebrow">The collection</p>
          <h2>
            Made for <em>curious minds.</em>
          </h2>
        </div>

        <div className="search-wrap">
          <Search size={16} />
          <input
            aria-label="Search collection"
            placeholder="Search the collection"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      <div className="filter-row">
        <div className="filter-buttons">
          {filters.map((filter) => (
            <button
              key={filter}
              type="button"
              className={category === filter ? "active" : ""}
              aria-pressed={category === filter}
              onClick={() => setCategory(filter)}
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="explore-dropdowns">
          <div className="date-filter-wrap">
            <button
              className="sort-button"
              type="button"
              aria-haspopup="listbox"
              aria-expanded={showDateDropdown}
              onClick={() => {
                setShowDateDropdown((previous) => !previous);
                setShowSortDropdown(false);
              }}
            >
              {
                DATE_FILTERS.find((option) => option.value === dateFilter)
                  ?.label
              }
              <ChevronRight
                size={14}
                className={showDateDropdown ? "date-chevron-open" : ""}
              />
            </button>

            {showDateDropdown && (
              <div
                className="date-dropdown"
                role="listbox"
                aria-label="Filter by upload date"
              >
                {DATE_FILTERS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={dateFilter === option.value}
                    className={dateFilter === option.value ? "active" : ""}
                    onClick={() => {
                      setDateFilter(option.value);
                      setShowDateDropdown(false);
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="date-filter-wrap">
            <button
              className="sort-button"
              type="button"
              aria-haspopup="listbox"
              aria-expanded={showSortDropdown}
              onClick={() => {
                setShowSortDropdown((previous) => !previous);
                setShowDateDropdown(false);
              }}
            >
              {SORT_OPTIONS.find((option) => option.value === sortOrder)?.label}
              <ChevronRight
                size={14}
                className={showSortDropdown ? "date-chevron-open" : ""}
              />
            </button>

            {showSortDropdown && (
              <div
                className="date-dropdown"
                role="listbox"
                aria-label="Sort videos"
              >
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={sortOrder === option.value}
                    className={sortOrder === option.value ? "active" : ""}
                    onClick={() => {
                      setSortOrder(option.value);
                      setShowSortDropdown(false);
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {!mounted || authLoading || loading ? (
        <div className="empty-state">
          <p>Loading videos...</p>
        </div>
      ) : !user ? (
        <div className="empty-state">
          <h3>Sign in to explore</h3>
          <p>Please sign in to view the video collection.</p>
        </div>
      ) : error ? (
        <div className="empty-state">
          <h3>Unable to load videos</h3>
          <p>{error}</p>
        </div>
      ) : filtered.length > 0 ? (
        <>
          <div className="content-grid">
            {paginatedVideos.map((item) => (
              <ContentCard item={item} key={item.id} />
            ))}
          </div>

          {totalPages > 1 && (
            <nav className="pagination" aria-label="Video pages">
              <button
                type="button"
                className="pagination-arrow"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                aria-label="Previous page"
              >
                <ChevronLeft size={18} />
                <span>Previous</span>
              </button>

              <div className="pagination-numbers">
                {pageNumbers.map((page) => {
                  const showEllipsis =
                    previousPageNumber !== 0 && page - previousPageNumber > 1;

                  previousPageNumber = page;

                  return (
                    <span key={page} className="pagination-item">
                      {showEllipsis && (
                        <span
                          className="pagination-ellipsis"
                          aria-hidden="true"
                        >
                          ...
                        </span>
                      )}

                      <button
                        type="button"
                        className={currentPage === page ? "active" : ""}
                        aria-current={currentPage === page ? "page" : undefined}
                        aria-label={`Page ${page}`}
                        onClick={() => goToPage(page)}
                      >
                        {page}
                      </button>
                    </span>
                  );
                })}
              </div>

              <button
                type="button"
                className="pagination-arrow"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                aria-label="Next page"
              >
                <span>Next</span>
                <ChevronRight size={18} />
              </button>
            </nav>
          )}

          <p className="pagination-summary">
            Showing {(currentPage - 1) * VIDEOS_PER_PAGE + 1}–
            {Math.min(currentPage * VIDEOS_PER_PAGE, filtered.length)} of{" "}
            {filtered.length} videos
          </p>
        </>
      ) : (
        <div className="empty-state">
          <Search size={24} />
          <h3>No published videos found</h3>
          <p>
            No videos match your current search and filters. Try selecting
            another category or date range.
          </p>
        </div>
      )}
    </section>
  );
}
