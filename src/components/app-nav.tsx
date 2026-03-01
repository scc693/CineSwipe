"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

function navClass(active: boolean): string {
  return active ? "nav-link nav-link-active" : "nav-link";
}

export function AppNav() {
  const pathname = usePathname();
  const { user, signInWithGoogle, signOutUser, loading } = useAuth();

  return (
    <header className="topbar">
      <div>
        <p className="brand">CineSwipe</p>
        <p className="tagline">Swipe to discover your next obsession</p>
      </div>
      <nav className="tabbar">
        <Link className={navClass(pathname.startsWith("/discover"))} href="/discover">
          Discover
        </Link>
        <Link className={navClass(pathname.startsWith("/library"))} href="/library">
          Library
        </Link>
      </nav>
      <div className="account">
        {loading ? (
          <span className="muted">Loading...</span>
        ) : user ? (
          <>
            <span className="muted">{user.displayName ?? user.email ?? "Signed in"}</span>
            <button className="ghost-btn" onClick={() => signOutUser()} type="button">
              Sign out
            </button>
          </>
        ) : (
          <button className="primary-btn" onClick={() => signInWithGoogle()} type="button">
            Sign in with Google
          </button>
        )}
      </div>
    </header>
  );
}
