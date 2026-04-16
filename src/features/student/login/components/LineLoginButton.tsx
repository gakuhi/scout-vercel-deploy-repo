"use client";

import { useState } from "react";
import { signInWithLine } from "../actions/login";

export function LineLoginButton() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    setIsLoading(true);
    try {
      const { url } = await signInWithLine();
      window.location.href = url;
    } catch {
      setIsLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className="flex w-full items-center justify-center gap-3 rounded-lg bg-[#06C755] px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-[#05b54c] disabled:opacity-60"
    >
      {/* LINE icon (SVG) */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="h-6 w-6"
      >
        <path d="M12 2C6.48 2 2 5.82 2 10.5c0 4.21 3.74 7.74 8.79 8.4.34.07.81.23.93.52.1.27.07.68.03.95l-.15.91c-.05.27-.21 1.07.94.58 1.15-.49 6.2-3.65 8.46-6.25C22.88 13.47 22 11.62 22 10.5 22 5.82 17.52 2 12 2zm-3.19 11.3H6.73a.53.53 0 0 1-.53-.54V8.51c0-.3.24-.54.53-.54.3 0 .54.24.54.54v3.72h1.54c.3 0 .54.24.54.53 0 .3-.24.54-.54.54zm1.83-.54a.53.53 0 0 1-.53.54.53.53 0 0 1-.54-.54V8.51c0-.3.24-.54.54-.54.29 0 .53.24.53.54v4.25zm4.45 0a.54.54 0 0 1-.43.52.52.52 0 0 1-.17.02.54.54 0 0 1-.44-.23l-2.11-2.88v2.57a.53.53 0 0 1-.54.54.53.53 0 0 1-.53-.54V8.51c0-.24.16-.45.38-.52a.52.52 0 0 1 .17-.02c.17 0 .34.09.44.23l2.11 2.88V8.51c0-.3.24-.54.54-.54.29 0 .53.24.53.54v4.25h.05zm2.83-2.64c.3 0 .54.24.54.53 0 .3-.24.54-.54.54h-1.54v1.04h1.54c.3 0 .54.24.54.53 0 .3-.24.54-.54.54h-2.07a.53.53 0 0 1-.54-.54V8.51c0-.3.24-.54.54-.54h2.07c.3 0 .54.24.54.54 0 .29-.24.53-.54.53h-1.54v1.04h1.54z" />
      </svg>
      {isLoading ? "接続中..." : "LINEでログイン / 新規登録"}
    </button>
  );
}
