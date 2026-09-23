import { useEffect, useRef, useState } from "react";

/** A map gesture pauses following; it resumes on its own after this delay. */
const followResumeDelayMs = 7_000;

type TimerRef = { current: ReturnType<typeof setTimeout> | null };

/**
 * Single source of truth for the camera follow mode of active navigation.
 * It starts on when navigation starts, a gesture on the map pauses it (and
 * schedules its resume) and the recenter control turns it back on.
 */
export function useNavigationFollow(active: boolean) {
  const [following, setFollowingState] = useState(active);
  const [trackedActive, setTrackedActive] = useState(active);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (trackedActive !== active) {
    setTrackedActive(active);
    setFollowingState(active);
  }

  // Stopping navigation (or leaving the screen) cancels a pending resume.
  useEffect(() => () => clearTimer(resumeTimerRef), [active]);

  const setFollowing = (next: boolean) => {
    clearTimer(resumeTimerRef);
    setFollowingState(next);
    if (next || !active) return;
    resumeTimerRef.current = setTimeout(() => {
      resumeTimerRef.current = null;
      setFollowingState(true);
    }, followResumeDelayMs);
  };

  return { following: active && following, setFollowing };
}

function clearTimer(timerRef: TimerRef): void {
  if (timerRef.current === null) return;
  clearTimeout(timerRef.current);
  timerRef.current = null;
}
