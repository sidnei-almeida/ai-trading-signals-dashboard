"use client";

import type { ReactElement } from "react";
import { ResponsiveContainer } from "recharts";

/**
 * `ResponsiveContainer` with its resize handler throttled.
 *
 * Collapsing the sidebar animates its width over 300ms, and the sidebar is a
 * flex sibling of the page content, so every chart is resized on every frame of
 * that animation. Recharts re-renders the entire SVG per resize, which drops
 * the animation to a few frames per second once a chart holds a few thousand
 * points. Throttling collapses that burst into one or two renders while leaving
 * the initial layout measurement synchronous.
 */
export const CHART_RESIZE_THROTTLE_MS = 200;

export function ChartFrame({ children }: { children: ReactElement }) {
  return (
    <ResponsiveContainer
      width="100%"
      height="100%"
      debounce={CHART_RESIZE_THROTTLE_MS}
    >
      {children}
    </ResponsiveContainer>
  );
}
