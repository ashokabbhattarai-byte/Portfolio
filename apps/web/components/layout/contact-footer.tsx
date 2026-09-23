import Image from 'next/image';
import { SectionCurve } from '@/components/motion/section-curve';
import { CircuitBackdrop } from '@/components/motion/circuit-backdrop';
import { TransitionLink } from '@/components/motion/transition-link';
import { getProfile } from '@/lib/content';
import { Magnetic } from '@/components/motion/magnetic';
export async function ContactFooter() {
  const profile = await getProfile();
  return (
    <footer className="contact-footer">
      <SectionCurve />
      {/* Calmer than the hero: this sits under the closing copy, not over a
          first impression. */}
      <CircuitBackdrop density={0.55} seed={81724} />
      <div className="section-shell">
        <div className="contact-heading">
          <h2>
            <span>
              <Image
                src="/assets/portrait.webp"
                alt={`${profile.name}, ${profile.role}`}
                width={90}
                height={90}
              />
              Let’s build
            </span>
            <br />
            something{' '}
            <span style={{ fontStyle: 'italic', fontWeight: 400 }}>
              worth keeping.
            </span>
          </h2>
          <span className="contact-arrow" aria-hidden="true">
            ↙
          </span>
        </div>
        <div className="contact-rule">
          <Magnetic>
            <TransitionLink
              href="/contact"
              className="round-button accent"
              aria-label={`Contact ${profile.name}`}
            >
              Get in touch <span aria-hidden="true">↗</span>
            </TransitionLink>
          </Magnetic>
        </div>
        <div className="contact-actions">
          <a
            className="pill"
            href={`mailto:${profile.email}`}
            aria-label={`Email ${profile.name} at ${profile.email}`}
          >
            {profile.email}
          </a>
          <a
            className="pill"
            href={profile.resume}
            target="_blank"
            rel="noreferrer"
          >
            View résumé <span aria-hidden="true">↗</span>
          </a>
        </div>
        {/* A crawlable link to every top-level route from the bottom of every
            page — the site's only complete internal-link set, since the header
            nav is behind a drawer on small screens. */}
        <nav className="footer-nav" aria-label="Footer">
          <TransitionLink href="/">Home</TransitionLink>
          <TransitionLink href="/projects">Projects</TransitionLink>
          <TransitionLink href="/blog">Writing</TransitionLink>
          <TransitionLink href="/about">About</TransitionLink>
          <TransitionLink href="/contact">Contact</TransitionLink>
        </nav>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} {profile.name}
          </span>
          <span>
            {profile.role} · {profile.location} · Replies within one working day
          </span>
          <a href={profile.github} target="_blank" rel="noreferrer">
            GitHub <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
