"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { signInWithLine } from "../actions/login";

const BACKGROUND_IMAGE_URL =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuB0CpYTOAd8pEZ5y-4RvCi3ieM0l28Wt3J0SFa5QrBhNuwvio2Yj8vIPQqa9vAn3QxU3rOk-iU_5IAFMo6K5Ed5htqfjwO7Y51I8kCWsEvPyDnbX9jWK7lM455tSMtlFjP-GdoOQoITiozNPp-4meAiIBm_NWKMPkCsAj4ka5xb6vhUqH-ndXVQ0Udnt6Zz-bbht_TOIS4e_m11chwU-U_AQA3rOjE7EWJ9IraOmKPRxV9slrO1LPMboICj5lgecG8LHPbXDgoI-Jw";

export function StudentLoginPage({ error }: { error?: string }) {
  return (
    <>
      <BackgroundShell />
      <main className="z-10 w-full max-w-md px-6 flex flex-col justify-center min-h-screen fixed inset-0 m-auto h-fit">
        <div className="bg-surface-container-lowest shadow-2xl rounded-xl overflow-hidden p-10 md:p-12">
          <Branding />
          {error && (
            <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <AuthOptions />
        </div>
      </main>
      <EditorialFooter />
      <VisualArtifacts />
    </>
  );
}

function BackgroundShell() {
  return (
    <div className="fixed inset-0 z-0">
      <div
        role="img"
        aria-label="Sophisticated twilight city skyline"
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url("${BACKGROUND_IMAGE_URL}")` }}
      />
      <div className="absolute inset-0 image-overlay" />
    </div>
  );
}

function Branding() {
  return (
    <div className="mb-12 text-center">
      <h1 className="text-4xl font-extrabold tracking-tight text-primary mb-3">
        SCOUT
      </h1>
      <p className="text-on-surface-variant text-sm font-medium tracking-wide">
        プロフェッショナルな未来への扉
      </p>
    </div>
  );
}

function AuthOptions() {
  return (
    <div className="space-y-8">
      <div className="space-y-6">
        <LineButton />
        <TermsNotice />
      </div>
    </div>
  );
}

function LineButton() {
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
      className="w-full flex items-center justify-center gap-3 line-green text-white py-4 px-6 rounded-xl font-bold shadow-lg hover:shadow-xl active:scale-[0.98] transition-all duration-200 disabled:opacity-60"
    >
      <Icon name="chat_bubble" filled className="text-2xl" />
      <span className="text-base">
        {isLoading ? "接続中..." : "LINEでログイン / 新規登録"}
      </span>
    </button>
  );
}

function TermsNotice() {
  return (
    <p className="text-center text-[11px] text-on-surface-variant leading-relaxed px-2">
      続行することで、弊社の{" "}
      <Link
        href="#"
        className="underline font-semibold hover:text-primary transition-colors"
      >
        利用規約
      </Link>{" "}
      および{" "}
      <Link
        href="#"
        className="underline font-semibold hover:text-primary transition-colors"
      >
        プライバシーポリシー
      </Link>{" "}
      に同意したものとみなされます。
    </p>
  );
}

function EditorialFooter() {
  return (
    <div className="flex justify-between items-center text-white/70 fixed bottom-10 left-0 right-0 max-w-md mx-auto px-6 z-10">
      <div className="flex flex-col">
        <span className="text-[10px] font-extrabold tracking-[0.2em] text-white/50 uppercase">
          Authentication
        </span>
        <span className="text-xs font-semibold">Secure Node v2.4</span>
      </div>
      <div className="h-10 w-px bg-white/20" />
      <div className="text-right flex flex-col">
        <span className="text-[10px] font-extrabold tracking-[0.2em] text-white/50 uppercase">
          Partnership
        </span>
        <span className="text-xs font-semibold">Enterprise Grade Security</span>
      </div>
    </div>
  );
}

function VisualArtifacts() {
  return (
    <>
      <div
        aria-hidden
        className="fixed top-0 left-0 w-1/4 h-screen bg-white/5 backdrop-blur-[2px] pointer-events-none -skew-x-12 -translate-x-1/2"
      />
      <div
        aria-hidden
        className="fixed bottom-0 right-0 w-1/4 h-screen bg-primary/5 backdrop-blur-[1px] pointer-events-none skew-x-12 translate-x-1/2"
      />
    </>
  );
}
