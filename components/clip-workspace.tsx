"use client";

import { useState } from "react";
import {
  ScissorsIcon,
  LinkIcon,
  MonitorPlayIcon,
  VideoIcon,
  ClapperboardIcon,
  TvIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { useAuthModal } from "@/_state/auth-modal.state";

const SUPPORTED_PLATFORMS = [
  { icon: MonitorPlayIcon, label: "YouTube" },
  { icon: VideoIcon, label: "Instagram" },
  { icon: ClapperboardIcon, label: "TikTok" },
  { icon: TvIcon, label: "Twitch" },
] as const;

type ClipWorkspaceProps = {
  isAuthenticated: boolean;
};

export function ClipWorkspace({ isAuthenticated }: ClipWorkspaceProps) {
  const [url, setUrl] = useState("");
  const { openModal } = useAuthModal();

  function handleGenerate() {
    if (!isAuthenticated) {
      openModal();
      return;
    }
    // Video processing — coming soon
  }

  return (
    <div className="flex flex-col h-svh w-full min-w-0">
      {/* ── Top bar ──────────────────────────────────────── */}
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border/50 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="h-4" />
        <span className="text-sm text-muted-foreground">New Clip</span>
      </header>

      {/* ── Workspace ────────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 overflow-y-auto">
        <div className="w-full max-w-2xl flex flex-col items-center gap-8">

          {/* Hero */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
              <ScissorsIcon className="size-5" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Turn Long Videos Into Short Clips
            </h1>
            <p className="text-base text-muted-foreground max-w-md leading-relaxed">
              Transform your long-form videos and livestreams into engaging
              short-form content for your favourite platforms.
            </p>
          </div>

          {/* URL input card */}
          <div className="w-full rounded-2xl border border-border bg-card shadow-sm p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LinkIcon className="size-3.5 shrink-0" />
              <span>Paste a video URL to get started</span>
            </div>

            <Textarea
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="resize-none min-h-[72px] text-sm bg-transparent border-input focus-visible:ring-1"
              aria-label="Video URL"
            />

            <div className="flex items-center justify-between gap-3 flex-wrap">
              {/* Platform badges */}
              <div className="flex flex-wrap gap-1.5">
                {SUPPORTED_PLATFORMS.map(({ icon: Icon, label }) => (
                  <Badge
                    key={label}
                    variant="secondary"
                    className="gap-1 px-2 py-0.5 text-xs font-normal"
                  >
                    <Icon className="size-3" />
                    {label}
                  </Badge>
                ))}
              </div>

              {/* Action button */}
              <Button
                onClick={handleGenerate}
                className="shrink-0 gap-2"
                aria-label={isAuthenticated ? "Generate clips (coming soon)" : "Sign in to generate clips"}
              >
                <ScissorsIcon className="size-3.5" />
                {isAuthenticated ? "Generate Clips" : "Get Started"}
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground/60 text-center">
            AI-powered clip generation is coming soon. Stay tuned.
          </p>
        </div>
      </div>
    </div>
  );
}
