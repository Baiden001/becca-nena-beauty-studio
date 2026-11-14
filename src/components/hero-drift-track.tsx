"use client";

import { useEffect, useRef } from "react";

interface Props {
  /** "x" drifts sideways (phone strip), "y" drifts vertically (desktop columns). */
  axis: "x" | "y";
  /** 1 = content moves left / up, -1 = content moves right / down. */
  direction?: 1 | -1;
  /** Auto-drift speed in pixels per second. */
  speed: number;
  /** Who can drag it: touch and mouse (phone strip), or mouse only (desktop
   *  columns, so a finger on a tablet still scrolls the page normally). */
  dragWith?: "all" | "mouse";
  className?: string;
  children: React.ReactNode;
}

/**
 * An endless, self-moving strip that people can also drag. No arrow buttons:
 * swipe or drag back to see an image that just passed, forward to skip ahead.
 *
 * The children are rendered twice, back to back. The strip slides by exactly
 * one copy and wraps around, so it loops forever in either direction with no
 * visible jump. It stops drifting while a finger or mouse is on it, resumes
 * a moment after letting go, and stays still for people who prefer reduced
 * motion (they can still drag it).
 */
export function DriftTrack({
  axis,
  direction = 1,
  speed,
  dragWith = "all",
  className = "",
  children,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    const copy = copyRef.current;
    if (!root || !track || !copy) return;

    const horizontal = axis === "x";
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let size = 0; // length of one copy
    let pos = 0; // how far along the strip we are, 0 .. size
    let last = performance.now();
    let raf = 0;

    let visible = true;
    let hovering = false;
    let dragging = false;
    let resumeAt = 0; // don't auto-drift before this time
    let autoFactor = 1; // eases drifting in and out instead of snapping
    let fling = 0; // momentum after letting go, px per second

    let startPointer = 0;
    let startPos = 0;
    let lastPointer = 0;
    let lastTime = 0;
    let pointerVelocity = 0;

    const measure = () => {
      size = horizontal ? copy.offsetWidth : copy.offsetHeight;
    };

    const render = () => {
      if (size > 0) pos = ((pos % size) + size) % size;
      track.style.transform = horizontal
        ? `translate3d(${-pos}px,0,0)`
        : `translate3d(0,${-pos}px,0)`;
    };

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      if (size > 0 && !dragging) {
        if (Math.abs(fling) > 1) {
          pos += fling * dt;
          fling *= Math.pow(0.04, dt); // momentum fades out over about a second
        } else {
          fling = 0;
        }

        const wantsDrift = !reduceMotion && visible && !hovering && now >= resumeAt;
        autoFactor += ((wantsDrift ? 1 : 0) - autoFactor) * Math.min(1, dt * 4);
        pos += direction * speed * autoFactor * dt;
        render();
      }
      raf = requestAnimationFrame(tick);
    };

    const canDrag = (e: PointerEvent) =>
      dragWith === "all" || e.pointerType === "mouse";

    const onDown = (e: PointerEvent) => {
      if (!canDrag(e)) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      dragging = true;
      fling = 0;
      startPointer = horizontal ? e.clientX : e.clientY;
      startPos = pos;
      lastPointer = startPointer;
      lastTime = performance.now();
      pointerVelocity = 0;
      root.setPointerCapture(e.pointerId);
    };

    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const p = horizontal ? e.clientX : e.clientY;
      pos = startPos - (p - startPointer);
      const t = performance.now();
      const elapsed = t - lastTime;
      if (elapsed > 0) {
        const instant = (-(p - lastPointer) / elapsed) * 1000;
        pointerVelocity = pointerVelocity * 0.7 + instant * 0.3;
      }
      lastPointer = p;
      lastTime = t;
      render();
    };

    // Also fires when the browser takes over for a vertical page scroll.
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      fling = Math.max(-2500, Math.min(2500, pointerVelocity));
      resumeAt = performance.now() + 1800;
    };

    const onEnter = (e: PointerEvent) => {
      if (e.pointerType === "mouse") hovering = true;
    };
    const onLeave = (e: PointerEvent) => {
      if (e.pointerType === "mouse") hovering = false;
    };

    measure();
    render();
    raf = requestAnimationFrame(tick);

    const resizeObserver = new ResizeObserver(() => {
      measure();
      render();
    });
    resizeObserver.observe(copy);

    // No point animating while the hero is scrolled out of view or hidden.
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
      },
      { threshold: 0 }
    );
    intersectionObserver.observe(root);

    root.addEventListener("pointerdown", onDown);
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerup", onUp);
    root.addEventListener("pointercancel", onUp);
    root.addEventListener("pointerenter", onEnter);
    root.addEventListener("pointerleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      root.removeEventListener("pointerdown", onDown);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerup", onUp);
      root.removeEventListener("pointercancel", onUp);
      root.removeEventListener("pointerenter", onEnter);
      root.removeEventListener("pointerleave", onLeave);
    };
  }, [axis, direction, speed, dragWith]);

  const flow = axis === "x" ? "flex" : "flex flex-col";

  return (
    <div
      ref={rootRef}
      className={`cursor-grab select-none overflow-hidden active:cursor-grabbing [&_img]:pointer-events-none ${
        axis === "x" ? "touch-pan-y" : ""
      } ${className}`}
    >
      <div ref={trackRef} className={`${flow} ${axis === "x" ? "w-max" : ""} will-change-transform`}>
        <div ref={copyRef} className={flow}>
          {children}
        </div>
        <div aria-hidden className={flow}>
          {children}
        </div>
      </div>
    </div>
  );
}
