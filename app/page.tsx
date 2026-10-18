"use client";

import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useEffect, useState } from "react";
import ExploreSection from "@/components/ExploreSection";
import Avatar from "boring-avatars";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  ArrowRight,
  Eye,
  Flame,
  Gem,
  Menu,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

const content = [
  {
    title: "After Hours",
    category: "Featured",
    duration: "18 min",
    tone: "pink",
    badge: "Popular",
    views: "12.4K views",
  },
  {
    title: "Neon Confessions",
    category: "Exclusive",
    duration: "22 min",
    tone: "violet",
    badge: "Trending",
    views: "9.8K views",
  },
  {
    title: "Velvet Room",
    category: "Premium",
    duration: "16 min",
    tone: "blue",
    badge: "Editor's pick",
    views: "8.2K views",
  },
  {
    title: "The Invitation",
    category: "Featured",
    duration: "25 min",
    tone: "gold",
    badge: "",
    views: "7.6K views",
  },
  {
    title: "Midnight Muse",
    category: "Exclusive",
    duration: "19 min",
    tone: "pink",
    badge: "",
    views: "6.9K views",
  },
  {
    title: "Private Gallery",
    category: "Premium",
    duration: "14 min",
    tone: "violet",
    badge: "",
    views: "5.7K views",
  },
];

const categories = [
  {
    name: "Trending now",
    detail: "What everyone is watching",
    icon: Flame,
    tone: "pink",
  },
  {
    name: "New releases",
    detail: "Freshly added tonight",
    icon: Sparkles,
    tone: "violet",
  },
  {
    name: "Most viewed",
    detail: "The community favorites",
    icon: Eye,
    tone: "blue",
  },
  {
    name: "Exclusive",
    detail: "Only on XSecrets",
    icon: Gem,
    tone: "gold",
  },
];

function Logo() {
  return (
    <a href="#home" className="brand" aria-label="XSecrets home">
      <img src="/logo.png" alt="XSecrets" className="brand-logo" />
    </a>
  );
}

function ContentCard({ item }: { item: (typeof content)[number] }) {
  return (
    <article className={`content-card tone-${item.tone}`}>
      <div className="card-art">
        <div className="art-orb" />
        <div className="art-line" />

        <span className="art-label">{item.category}</span>

        {item.badge && <span className="card-badge">{item.badge}</span>}

        <button
          className="play-button"
          aria-label={`Preview ${item.title}`}
          type="button"
        >
          <Play size={15} fill="currentColor" />
        </button>

        <div className="card-shade" />
      </div>
    </article>
  );
}

export default function Page() {
  const [ageVerified, setAgeVerified] = useState(false);
  const [ageCheckComplete, setAgeCheckComplete] = useState(false);
  const [ageDenied, setAgeDenied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const { user, loading } = useAuth();

  const [profileAvatar, setProfileAvatar] = useState({
    avatarSeed: "",
    avatarVariant: "beam",
  });

  // Check saved age confirmation when the page loads.
  useEffect(() => {
    try {
      const verified = localStorage.getItem("xsecrets-age-verified");
      setAgeVerified(verified === "true");
    } catch (error) {
      console.error("Unable to read age confirmation:", error);
      setAgeVerified(false);
    } finally {
      setAgeCheckComplete(true);
    }
  }, []);

  // Load the signed-in user's avatar.
  useEffect(() => {
    if (!user || !ageVerified) return;

    const profileRef = doc(db, "anonymous", user.uid);

    return onSnapshot(
      profileRef,
      (snapshot) => {
        const data = snapshot.data();

        setProfileAvatar({
          avatarSeed: data?.avatarSeed || user.uid,
          avatarVariant: data?.avatarVariant || "beam",
        });
      },
      (error) => {
        console.error("Unable to load profile avatar:", error);
      },
    );
  }, [user, ageVerified]);

  function confirmAge() {
    try {
      localStorage.setItem("xsecrets-age-verified", "true");
      setAgeVerified(true);
    } catch (error) {
      console.error("Unable to save age confirmation:", error);
    }
  }

  // Show a loading screen while checking localStorage.
  if (!ageCheckComplete) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#09090d] text-white">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-fuchsia-500 border-t-transparent"
          role="status"
          aria-label="Loading"
        />
      </main>
    );
  }

  // Show the restricted screen if the visitor declines.
  if (ageDenied) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#09090d] px-6 text-center text-white">
        <div className="max-w-md">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl font-bold text-fuchsia-400">
            X
          </div>

          <h1 className="mb-4 text-3xl font-bold">Access Restricted</h1>

          <p className="mb-6 text-zinc-400">
            You must meet the legal minimum age requirement to access XSecrets.
          </p>

          <a
            href="https://www.google.com"
            className="inline-flex rounded-xl bg-white px-6 py-3 font-semibold text-black transition hover:bg-zinc-200"
          >
            Leave website
          </a>
        </div>
      </main>
    );
  }

  // Display the age verification screen before rendering the homepage.
  if (!ageVerified) {
    return (
      <main className="fixed inset-0 z-[9999] flex min-h-screen items-center justify-center overflow-y-auto bg-[#09090d] px-4 py-8 text-white">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-1/2 h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-600/15 blur-[100px]" />
          <div className="absolute left-0 top-0 h-64 w-64 rounded-full bg-violet-600/10 blur-[90px]" />
        </div>

        <section
          className="age-modal relative z-10 mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-[#111116]/95 p-6 text-center shadow-2xl shadow-fuchsia-950/30 backdrop-blur-xl sm:p-9"
          role="dialog"
          aria-modal="true"
          aria-labelledby="age-modal-title"
          aria-describedby="age-modal-description"
        >
          <div className="modal-mark mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-fuchsia-400/25 bg-fuchsia-500/10 text-2xl font-bold text-fuchsia-400 shadow-lg shadow-fuchsia-950/20">
            X
          </div>

          <p className="eyebrow mb-3 text-xs uppercase tracking-[0.25em] text-fuchsia-400">
            Welcome to XSecrets
          </p>

          <h1
            id="age-modal-title"
            className="mb-4 text-3xl font-bold leading-tight sm:text-4xl"
          >
            Is this your <em className="text-fuchsia-400">secret side?</em>
          </h1>

          <p
            id="age-modal-description"
            className="mb-7 text-sm leading-7 text-zinc-400"
          >
            This website is intended for adults only. You must be at least 18
            years old, or meet the higher legal age requirement in your
            location, to continue.
          </p>

          <button
            className="button button-primary modal-continue flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-fuchsia-600 px-6 py-4 font-semibold text-white transition hover:bg-fuchsia-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111116]"
            type="button"
            onClick={confirmAge}
          >
            I am 18+ <ArrowRight size={18} />
          </button>

          <button
            className="exit-button mt-4 min-h-11 w-full rounded-xl border border-white/10 px-5 py-3 text-sm text-zinc-400 transition hover:border-white/20 hover:text-white"
            type="button"
            onClick={() => setAgeDenied(true)}
          >
            I am under 18 — Exit
          </button>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-zinc-500">
            <ShieldCheck size={15} className="text-fuchsia-400" />
            <span>Your age confirmation is saved in this browser.</span>
          </div>
        </section>
      </main>
    );
  }

  // Original homepage: rendered only after age confirmation.
  return (
    <main className="site-shell" id="home">
      <header className="site-header">
        <div className="header-inner">
          <Logo />

          <nav
            className={`main-nav ${menuOpen ? "is-open" : ""}`}
            aria-label="Primary navigation"
          >
            {["Home", "Explore", "About"].map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase()}`}
                onClick={() => setMenuOpen(false)}
              >
                {link}
              </a>
            ))}
          </nav>

          <div className="header-actions">
            <button
              className="icon-button"
              aria-label="Search"
              type="button"
              onClick={() =>
                document
                  .getElementById("explore")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              <Search size={19} />
            </button>

            {loading ? (
              <div
                className="account-button"
                aria-label="Loading account"
                aria-busy="true"
              >
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-fuchsia-400 border-t-transparent" />
              </div>
            ) : user ? (
              <a
                href="/profile"
                className="account-button"
                aria-label="Open profile"
                title="Your profile"
              >
                <Avatar
                  size={30}
                  name={profileAvatar.avatarSeed || user.uid}
                  variant={
                    profileAvatar.avatarVariant as
                      | "beam"
                      | "marble"
                      | "pixel"
                      | "sunset"
                      | "ring"
                  }
                  colors={[
                    "#7c3aed",
                    "#a855f7",
                    "#ec4899",
                    "#f97316",
                    "#facc15",
                  ]}
                />
                <span>Profile</span>
              </a>
            ) : (
              <a href="/profile" className="account-button">
                <span>Continue</span>
              </a>
            )}

            <button
              className="menu-toggle"
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </div>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-image" />
        <div className="hero-glow" />

        <div className="hero-content">
          <p className="eyebrow">
            <span className="eyebrow-line" />
            Curated after dark
          </p>

          <h1 id="hero-title">
            Discover your
            <br />
            <em>secret side.</em>
          </h1>

          <p className="hero-copy">
            Explore exclusive adult entertainment in a modern, private, and
            immersive experience.
          </p>

          <div className="hero-actions">
            <a className="button button-primary" href="#explore">
              Explore now <ArrowRight size={17} />
            </a>
          </div>

          <div className="hero-note">
            <ShieldCheck size={15} />
            Private, secure &amp; always discreet
          </div>
        </div>

        <div className="hero-stat">
          <span className="stat-number">
            18<span>+</span>
          </span>

          <span>
            Adults only
            <br />
            Always private
          </span>
        </div>
      </section>

      <ExploreSection />

      <footer className="site-footer" id="about">
        <div className="footer-disclaimer">
          <p>
            <strong>Disclaimer:</strong> All videos and media featured on this
            website belong to their respective owners and copyright holders.
            XSecrets does not claim ownership of third-party content. All
            trademarks, names, and copyrights belong to their respective owners.
            If you are a copyright owner and believe your content has been
            displayed without authorization, please contact us at{" "}
            <a href="mailto:xstream.secrets@gmail.com">
              xstream.secrets@gmail.com
            </a>{" "}
            to request a review or removal.
          </p>
        </div>

        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} XSecrets.xyz. All Rights Reserved.
          </span>
        </div>
      </footer>
    </main>
  );
}
