'use client';
import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { SplitText } from 'gsap/SplitText';
gsap.registerPlugin(CustomEase, SplitText);
/* One motion language for the whole site: fast departure, long settle. Named
   so timelines read as intent rather than as four anonymous numbers. */
CustomEase.create('rise', '0.16, 1, 0.3, 1');
CustomEase.create('curtain', '0.76, 0, 0.24, 1');
CustomEase.create('glide', '0.65, 0, 0.35, 1');
export type Flow = 'full' | 'calm';
export const flowEvent = 'portfolio:flow';
export const flowKey = 'portfolio-motion';
/* The document carries the mode so CSS and GSAP can never disagree about it.
   An inline script sets it before the first paint; see app/layout.tsx. */
export const flow = (): Flow =>
  document.documentElement.dataset.flow === 'calm' ? 'calm' : 'full';
export const travels = () => flow() === 'full';
export const setFlow = (next: Flow) => {
  document.documentElement.dataset.flow = next;
  try {
    localStorage.setItem(flowKey, next);
  } catch {}
  window.dispatchEvent(new Event(flowEvent));
};
/* Re-arm on a toggle, and on the system preference changing mid-session as
   long as the visitor has not already made the choice themselves. */
export const watchFlow = (rearm: () => void) => {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)');
  const system = () => {
    let chosen: string | null = null;
    try {
      chosen = localStorage.getItem(flowKey);
    } catch {}
    if (chosen === 'full' || chosen === 'calm') return;
    document.documentElement.dataset.flow = query.matches ? 'calm' : 'full';
    rearm();
  };
  window.addEventListener(flowEvent, rearm);
  query.addEventListener('change', system);
  return () => {
    window.removeEventListener(flowEvent, rearm);
    query.removeEventListener('change', system);
  };
};
/* Masked line reveal: the brief's Phase 13 asks for lines rising out of a clip
   rather than letter-by-letter noise. `autoSplit` re-measures once the webfont
   lands and on resize, so lines never break against the fallback metrics. */
export const revealLines = (
  target: gsap.DOMTarget,
  { delay = 0, stagger = 0.09 }: { delay?: number; stagger?: number } = {},
) => {
  const full = travels();
  return SplitText.create(target, {
    type: 'lines',
    mask: 'lines',
    linesClass: 'split-line',
    autoSplit: true,
    aria: 'auto',
    onSplit: (self) =>
      gsap.from(self.lines, {
        yPercent: full ? 108 : 0,
        opacity: full ? 1 : 0,
        duration: full ? 0.95 : 0.45,
        stagger: full ? stagger : Math.min(stagger, 0.05),
        ease: full ? 'rise' : 'none',
        delay,
      }),
  });
};
