/**
 * Shared Framer Motion animation variants for the entire HMS application.
 * Import and use these to keep animations consistent across all portals.
 */

/* ── Page-level transitions ───────────────────────────────── */
export const pageVariants = {
  initial:  { opacity: 0, y: 18 },
  animate:  { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
  exit:     { opacity: 0, y: -12, transition: { duration: 0.28 } },
};

export const pageSlideLeft = {
  initial:  { opacity: 0, x: 40 },
  animate:  { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
  exit:     { opacity: 0, x: -20, transition: { duration: 0.25 } },
};

/* ── Stagger container ────────────────────────────────────── */
export const staggerContainer = {
  animate: {
    transition: { staggerChildren: 0.07, delayChildren: 0.1 },
  },
};

export const staggerFast = {
  animate: {
    transition: { staggerChildren: 0.04, delayChildren: 0.05 },
  },
};

export const staggerSlow = {
  animate: {
    transition: { staggerChildren: 0.12, delayChildren: 0.15 },
  },
};

/* ── Child items ──────────────────────────────────────────── */
export const fadeUp = {
  initial:  { opacity: 0, y: 20 },
  animate:  { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

export const fadeDown = {
  initial:  { opacity: 0, y: -20 },
  animate:  { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

export const fadeLeft = {
  initial:  { opacity: 0, x: -24 },
  animate:  { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

export const fadeRight = {
  initial:  { opacity: 0, x: 24 },
  animate:  { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

export const scalePop = {
  initial:  { opacity: 0, scale: 0.88 },
  animate:  { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 380, damping: 28 } },
};

export const scaleUp = {
  initial:  { opacity: 0, scale: 0.94 },
  animate:  { opacity: 1, scale: 1, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
};

/* ── Modal/overlay ────────────────────────────────────────── */
export const modalOverlay = {
  initial:  { opacity: 0 },
  animate:  { opacity: 1, transition: { duration: 0.22 } },
  exit:     { opacity: 0, transition: { duration: 0.18 } },
};

export const modalContent = {
  initial:  { opacity: 0, scale: 0.93, y: 20 },
  animate:  { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 420, damping: 30 } },
  exit:     { opacity: 0, scale: 0.94, y: 16, transition: { duration: 0.22 } },
};

export const drawerRight = {
  initial:  { opacity: 0, x: '100%' },
  animate:  { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 320, damping: 32 } },
  exit:     { opacity: 0, x: '100%', transition: { duration: 0.25 } },
};

export const drawerLeft = {
  initial:  { opacity: 0, x: '-100%' },
  animate:  { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 320, damping: 32 } },
  exit:     { opacity: 0, x: '-100%', transition: { duration: 0.25 } },
};

/* ── Card hover ───────────────────────────────────────────── */
export const cardHover = {
  rest:     { y: 0, boxShadow: '0 2px 10px rgba(15,23,42,0.05)' },
  hover:    { y: -4, boxShadow: '0 12px 32px rgba(15,23,42,0.12)', transition: { duration: 0.25 } },
};

export const cardHoverGlow = (color: string) => ({
  rest:  { y: 0, boxShadow: '0 2px 10px rgba(15,23,42,0.05)' },
  hover: { y: -4, boxShadow: `0 12px 32px ${color}22`, transition: { duration: 0.22 } },
});

/* ── List rows ────────────────────────────────────────────── */
export const listRow = {
  initial:  { opacity: 0, x: -16 },
  animate:  { opacity: 1, x: 0, transition: { duration: 0.32, ease: 'easeOut' } },
  exit:     { opacity: 0, x: 16, height: 0, transition: { duration: 0.25 } },
};

/* ── Badge/pill pop ───────────────────────────────────────── */
export const badgePop = {
  initial:  { opacity: 0, scale: 0.6 },
  animate:  { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 500, damping: 22 } },
};

/* ── Sidebar nav items ────────────────────────────────────── */
export const navItem = (i: number) => ({
  initial:  { opacity: 0, x: -18 },
  animate:  { opacity: 1, x: 0, transition: { delay: 0.04 + i * 0.05, duration: 0.35, ease: 'easeOut' } },
});

/* ── Hero float ───────────────────────────────────────────── */
export const heroFloat = {
  animate: {
    y: [0, -8, 0],
    transition: { duration: 3.5, repeat: Infinity, ease: 'easeInOut' },
  },
};

/* ── Tap press ─────────────────────────────────────────────── */
export const tapPress = { whileTap: { scale: 0.96 } };

/* ── Stat counter (use with useEffect) ────────────────────── */
export function useCountUp(target: number, duration = 1000): number {
  // This is a pure number helper — use in React hooks
  return target;
}

/* ── Rotate spin (for loading) ───────────────────────────── */
export const spinAnimate = {
  animate: { rotate: 360, transition: { duration: 1, repeat: Infinity, ease: 'linear' } },
};

/* ── Pulse scale ──────────────────────────────────────────── */
export const pulseScale = {
  animate: {
    scale: [1, 1.07, 1],
    transition: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' },
  },
};

/* ── Slide reveal (for bottom sheets) ───────────────────── */
export const slideUp = {
  initial:  { opacity: 0, y: '100%' },
  animate:  { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 35 } },
  exit:     { opacity: 0, y: '100%', transition: { duration: 0.28 } },
};

/* ── Bounce notification ──────────────────────────────────── */
export const bounceIn = {
  initial:  { opacity: 0, scale: 0.4, y: -20 },
  animate:  { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 600, damping: 24 } },
  exit:     { opacity: 0, scale: 0.7, y: -12, transition: { duration: 0.18 } },
};

/* ── Expand/collapse ──────────────────────────────────────── */
export const expandCollapse = {
  initial:  { opacity: 0, height: 0 },
  animate:  { opacity: 1, height: 'auto', transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
  exit:     { opacity: 0, height: 0, transition: { duration: 0.22 } },
};

/* ── Typing cursor blink ──────────────────────────────────── */
export const blink = {
  animate: {
    opacity: [1, 0, 1],
    transition: { duration: 1.1, repeat: Infinity, ease: 'linear' },
  },
};
