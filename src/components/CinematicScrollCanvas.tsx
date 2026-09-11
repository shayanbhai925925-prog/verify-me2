"use client";

import React, { useEffect, useRef, useState } from "react";

interface CinematicScrollCanvasProps {
  progress: number; // 0 to 1
  className?: string;
}

export default function CinematicScrollCanvas({
  progress,
  className = "",
}: CinematicScrollCanvasProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [duration, setDuration] = useState<number>(10.01);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  // Smooth lerp state
  const targetTimeRef = useRef<number>(0);
  const currentTimeRef = useRef<number>(0);
  const isSeekingRef = useRef<boolean>(false);
  const rafIdRef = useRef<number | null>(null);

  // Load video via Blob to guarantee 100% instant seekability across browsers
  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;

    async function loadBlob() {
      try {
        const response = await fetch("/media/robot-scrub.mp4");
        if (!response.ok) throw new Error("Failed to fetch scrub video");
        const blob = await response.blob();
        if (active) {
          createdUrl = URL.createObjectURL(blob);
          setBlobUrl(createdUrl);
        }
      } catch (err) {
        console.warn("Blob fetch fallback to direct URL:", err);
        if (active) {
          setBlobUrl("/media/robot-scrub.mp4");
        }
      }
    }

    loadBlob();

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, []);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      if (dur && !isNaN(dur) && isFinite(dur) && dur > 0) {
        setDuration(dur);
      }
      setVideoLoaded(true);
      // Ensure initial frame is decoded
      videoRef.current.currentTime = 0;
    }
  };

  // Update target time when scroll progress changes
  useEffect(() => {
    const clampedProgress = Math.min(Math.max(progress, 0), 1);
    // Add an epsilon clamp to prevent seeking past duration
    const safeMax = Math.max(0, duration - 0.05);
    targetTimeRef.current = clampedProgress * safeMax;
  }, [progress, duration]);

  // High-performance continuous animation loop with lerp smoothing & seek coalescing
  useEffect(() => {
    if (!videoLoaded) return;

    let isSubscribed = true;

    const tick = () => {
      if (!isSubscribed) return;

      const video = videoRef.current;
      if (video) {
        const target = targetTimeRef.current;
        const current = currentTimeRef.current;
        const delta = target - current;

        // Dynamic lerp factor: faster catchup on large moves, buttery smooth on fine scrolling
        const absDelta = Math.abs(delta);
        const lerpFactor = absDelta > 1.5 ? 0.22 : absDelta > 0.4 ? 0.16 : 0.12;

        if (absDelta > 0.005) {
          const nextTime = current + delta * lerpFactor;
          currentTimeRef.current = nextTime;

          if (!isSeekingRef.current) {
            isSeekingRef.current = true;
            try {
              // Prefer fastSeek if supported for hardware performance, otherwise standard currentTime
              if ("fastSeek" in video && typeof (video as any).fastSeek === "function") {
                (video as any).fastSeek(nextTime);
              } else {
                video.currentTime = nextTime;
              }
            } catch {
              video.currentTime = nextTime;
            }
          }
        }
      }

      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);

    return () => {
      isSubscribed = false;
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [videoLoaded]);

  const handleSeeked = () => {
    isSeekingRef.current = false;
  };

  return (
    <div className={`relative w-full h-full overflow-hidden bg-[#040507] ${className}`}>
      {/* Background Fallback Poster */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-opacity duration-700 pointer-events-none"
        style={{
          backgroundImage: "url('/media/robot-hero.jpg')",
          opacity: videoLoaded ? 0 : 0.85,
        }}
      />

      {/* Primary Scrub Video Element */}
      {blobUrl && (
        <video
          ref={videoRef}
          src={blobUrl}
          muted
          playsInline
          preload="auto"
          onLoadedMetadata={handleLoadedMetadata}
          onSeeked={handleSeeked}
          className="w-full h-full object-cover object-center select-none pointer-events-none filter contrast-[1.04] brightness-[0.96] will-change-transform"
        />
      )}

      {/* Atmospheric Cinematic Gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#040507] via-transparent to-[#040507]/80 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#040507]/90 via-transparent to-[#040507]/90 pointer-events-none" />
      <div className="absolute inset-0 vignette-overlay pointer-events-none" />
      <div className="absolute inset-0 scanlines opacity-20 pointer-events-none" />

      {/* Subtle Dynamic Ambient Lighting */}
      <div className="absolute top-1/4 right-1/4 w-[32rem] h-[32rem] bg-amber-500/5 rounded-full blur-3xl pointer-events-none animate-subtle-glow" />
      <div className="absolute bottom-1/3 left-1/4 w-[28rem] h-[28rem] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none animate-subtle-glow" />
    </div>
  );
}
