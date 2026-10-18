"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Eye,
  Film,
  LayoutDashboard,
  Menu,
  Plus,
  ShieldCheck,
  Users,
  X,
  Clock,
  Search,
  Bell,
  Play,
  LogOut,
} from "lucide-react";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

const stats = [
  {
    title: "Total Users",
    value: "0",
    change: "Connect your database",
    icon: Users,
  },
  {
    title: "Published Content",
    value: "0",
    change: "No content data yet",
    icon: Film,
  },
  {
    title: "Total Views",
    value: "0",
    change: "No analytics data yet",
    icon: Eye,
  },
  {
    title: "Pending Reports",
    value: "0",
    change: "No report data yet",
    icon: ShieldCheck,
  },
];

const initialContent = [
  {
    title: "No content added yet",
    category: "Getting started",
    status: "Empty",
    views: "—",
  },
];

export default function AdminDashboardPage() {
  const router = useRouter();

  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [content] = useState(initialContent);
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/admin/login");
        return;
      }

      setAuthChecking(false);
    });

    return () => unsubscribe();
  }, [router]);

  const filteredContent = content.filter((item) =>
    item.title.toLowerCase().includes(search.toLowerCase()),
  );
  async function handleLogout() {
    try {
      await signOut(auth);
      router.replace("/admin/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }
  // Huwag ipakita ang dashboard habang vine-verify ang login.
  if (authChecking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#09090d] text-white">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-fuchsia-500 border-t-transparent" />
          <p className="mt-4 text-sm text-zinc-400">
            Checking authentication...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#09090d] text-white">
      <div className="flex min-h-screen">
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-64 flex-col overflow-hidden border-r border-white/10 bg-[#0e0e14] transition-transform duration-300 lg:sticky lg:top-0 lg:translate-x-0 ${
            menuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-20 shrink-0 items-center justify-between border-b border-white/10 px-6">
            <a
              href="/admin/dashboard"
              className="flex items-center"
              aria-label="XSecrets Admin Dashboard"
            >
              <Image
                src="/logo.png"
                alt="XSecrets Logo"
                width={160}
                height={48}
                priority
                className="h-10 w-auto object-contain"
              />
            </a>

            <button
              onClick={() => setMenuOpen(false)}
              className="rounded-lg p-2 hover:bg-white/10 lg:hidden"
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Workspace
            </p>

            <a
              href="/admin/dashboard"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/10 px-4 py-3 font-medium text-fuchsia-300"
            >
              <LayoutDashboard size={19} />
              Dashboard
            </a>

            <a
              href="/admin/dashboard/content"
              onClick={() => setMenuOpen(false)}
              className="mt-2 flex items-center gap-3 rounded-xl px-4 py-3 text-zinc-400 transition hover:bg-white/5 hover:text-white"
            >
              <Film size={19} />
              Content Management
            </a>
          </div>

          <div className="mt-auto shrink-0 space-y-3 border-t border-white/10 bg-[#0e0e14] p-4">
            <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-fuchsia-600/20 text-fuchsia-300">
                <ShieldCheck size={20} />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">Administrator</p>
                <p className="text-xs text-zinc-500">Admin panel</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="flex min-h-12 w-full shrink-0 items-center justify-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300 transition hover:border-red-500/40 hover:bg-red-500/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </aside>

        {menuOpen && (
          <button
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            aria-label="Close sidebar overlay"
          />
        )}

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-white/10 bg-[#09090d]/90 px-4 backdrop-blur-xl sm:px-8">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMenuOpen(true)}
                className="rounded-lg border border-white/10 p-2 hover:bg-white/5 lg:hidden"
                aria-label="Open menu"
              >
                <Menu size={21} />
              </button>

              <div>
                <h1 className="text-lg font-bold sm:text-xl">Dashboard</h1>
                <p className="hidden text-xs text-zinc-500 sm:block">
                  Welcome to your XSecrets admin workspace.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <span className="hidden items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400 sm:flex">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Admin workspace
              </span>

              <button
                className="rounded-xl border border-white/10 p-2.5 text-zinc-400 hover:bg-white/5 hover:text-white"
                aria-label="Notifications"
              >
                <Bell size={19} />
              </button>
            </div>
          </header>

          <div className="mx-auto max-w-[1600px] space-y-8 p-4 sm:p-8">
            <div className="relative overflow-hidden rounded-2xl border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-950/60 via-[#17101f] to-[#101018] p-6 sm:p-8">
              <div className="pointer-events-none absolute -right-12 -top-24 h-64 w-64 rounded-full bg-fuchsia-600/15 blur-3xl" />

              <div className="relative max-w-2xl">
                <span className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-3 py-1.5 text-xs font-medium text-fuchsia-300">
                  <Activity size={14} />
                  Admin overview
                </span>

                <h2 className="mt-5 text-2xl font-black tracking-tight sm:text-4xl">
                  Manage your platform.
                  <span className="block text-fuchsia-400">
                    All in one place.
                  </span>
                </h2>

                <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400">
                  Monitor your platform, review your content, and keep track of
                  activity from one centralized dashboard.
                </p>

                <a
                  href="#content"
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-fuchsia-600 px-5 py-3 text-sm font-semibold transition hover:bg-fuchsia-500"
                >
                  View content
                  <ArrowUpRight size={17} />
                </a>
              </div>
            </div>

            <section>
              <div className="mb-5 flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">Platform overview</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Statistics will appear when connected to real data.
                  </p>
                </div>

                <span className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-400">
                  Overview
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map((stat) => {
                  const Icon = stat.icon;

                  return (
                    <div
                      key={stat.title}
                      className="rounded-2xl border border-white/10 bg-[#101016] p-5 transition hover:border-fuchsia-500/30"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-400">
                          {stat.title}
                        </span>

                        <div className="rounded-xl border border-fuchsia-500/10 bg-fuchsia-500/10 p-2.5 text-fuchsia-300">
                          <Icon size={19} />
                        </div>
                      </div>

                      <p className="mt-5 text-3xl font-black tracking-tight">
                        {stat.value}
                      </p>

                      <p className="mt-2 text-xs text-zinc-500">
                        {stat.change}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section
              id="content"
              className="overflow-hidden rounded-2xl border border-white/10 bg-[#101016]"
            >
              <div className="flex flex-col gap-4 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div>
                  <h2 className="text-lg font-bold">Recent content</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Your latest content will appear here.
                  </p>
                </div>

                <a
                  href="/admin/dashboard/content"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-fuchsia-600 px-4 py-2.5 text-sm font-semibold hover:bg-fuchsia-500"
                >
                  <Plus size={17} />
                  Manage content
                </a>
              </div>

              <div className="border-b border-white/10 p-4">
                <div className="relative max-w-sm">
                  <Search
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                  />

                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search content..."
                    className="w-full rounded-xl border border-white/10 bg-[#09090d] py-2.5 pl-10 pr-4 text-sm outline-none transition placeholder:text-zinc-600 focus:border-fuchsia-500/50"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left text-sm">
                  <thead className="bg-white/[0.02] text-xs uppercase tracking-wider text-zinc-500">
                    <tr>
                      <th className="px-6 py-4 font-medium">Content</th>
                      <th className="px-6 py-4 font-medium">Category</th>
                      <th className="px-6 py-4 font-medium">Status</th>
                      <th className="px-6 py-4 font-medium">Views</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/5">
                    {filteredContent.length > 0 ? (
                      filteredContent.map((item) => (
                        <tr key={item.title} className="hover:bg-white/[0.02]">
                          <td className="px-6 py-5 font-medium">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-zinc-500">
                                <Play size={17} />
                              </div>
                              {item.title}
                            </div>
                          </td>

                          <td className="px-6 py-5 text-zinc-400">
                            {item.category}
                          </td>

                          <td className="px-6 py-5">
                            <span className="rounded-full border border-zinc-500/20 bg-zinc-500/10 px-2.5 py-1 text-xs text-zinc-400">
                              {item.status}
                            </span>
                          </td>

                          <td className="px-6 py-5 text-zinc-400">
                            {item.views}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-6 py-10 text-center text-zinc-500"
                        >
                          No matching content found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t border-white/10 px-5 py-4 text-xs text-zinc-500">
                <span>Demo interface · No database connected</span>
                <span className="flex items-center gap-1.5">
                  <Clock size={13} />
                  Live data unavailable
                </span>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#101016] p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
                  <Activity size={20} />
                </div>

                <div>
                  <h2 className="font-bold">System status</h2>
                  <p className="text-sm text-zinc-500">
                    Application interface loaded
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3 border-t border-white/10 pt-5 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span className="text-zinc-400">
                  Database and admin authorization
                </span>

                <span className="w-fit rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-400">
                  Not configured
                </span>
              </div>
            </section>

            <footer className="pb-4 text-center text-xs text-zinc-600">
              XSecrets Admin · Secure your admin routes before deployment.
            </footer>
          </div>
        </section>
      </div>
    </main>
  );
}
