import type { Metadata } from 'next';
import { TransitionLink } from '@/components/motion/transition-link';
/* A 404 must never be indexed, whatever the route it stood in for. */
export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: true },
};
export default function NotFound() {
  return (
    <main
      id="main"
      tabIndex={-1}
      className="inner-page section-shell not-found"
    >
      <p className="section-label">404: Page not found</p>
      <h1>
        This page
        <br />
        no longer exists.
      </h1>
      <p>
        The link may be out of date, or the page may have moved. The projects
        and blogs are all still here.
      </p>
      <TransitionLink className="pill" href="/">
        Back to home <span aria-hidden="true">↗</span>
      </TransitionLink>
      <TransitionLink className="text-link" href="/projects">
        Browse all projects
      </TransitionLink>
    </main>
  );
}
