import Image from 'next/image';
import { SectionCurve } from '@/components/motion/section-curve';
import { TransitionLink } from '@/components/motion/transition-link';
import { getProfile } from '@/lib/content';
import { Magnetic } from '@/components/motion/magnetic';
import hero from '@/components/sections/hero.module.css';
import { FooterAtmosphere } from './footer-atmosphere';
export async function ContactFooter() {
  const profile = await getProfile();
  return (
    <footer className="contact-footer">
      <SectionCurve />
      {/* Hero-consistent premium atmosphere — same dot-field + glow + 80px grid as hero.
          Old CircuitBackdrop removed for UI consistency; animations preserved via GSAP. */}
      <FooterAtmosphere />
      {/* Premium tech scanning line — hero rectangle echo */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background:
            'linear-gradient(90deg, transparent 8%, #c7dca8 50%, transparent 92%)',
          opacity: 0.55,
          pointerEvents: 'none',
          boxShadow: '0 0 14px rgba(168,191,130,0.6)',
          zIndex: 1,
        }}
      />
      <div className="section-shell">
        <div className="contact-heading">
          <h2>
            <span>
              <span
                style={{
                  position: 'relative',
                  display: 'inline-block',
                  width: 'clamp(56px,6vw,90px)',
                  height: 'clamp(56px,6vw,90px)',
                  borderRadius: 22,
                  overflow: 'hidden',
                  border: '1px solid rgba(199,220,168,0.25)',
                  boxShadow:
                    '0 8px 24px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.08)',
                  background: '#0c213c',
                  flexShrink: 0,
                }}
                aria-hidden="true"
              >
                <Image
                  src="/assets/portrait.webp"
                  alt={`${profile.name}, ${profile.role}`}
                  width={90}
                  height={90}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: '50% 20%',
                    display: 'block',
                  }}
                />
                <span
                  className={hero.corner}
                  data-corner="tl"
                  style={{
                    width: 18,
                    height: 18,
                    top: 10,
                    left: 10,
                    opacity: 1,
                    transform: 'scale(1)',
                  }}
                />
                <span
                  className={hero.corner}
                  data-corner="br"
                  style={{
                    width: 18,
                    height: 18,
                    bottom: 10,
                    right: 10,
                    opacity: 1,
                    transform: 'scale(1)',
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 22,
                    background:
                      'linear-gradient(105deg, transparent 34%, rgba(255,255,255,0.12) 48%, transparent 58%)',
                    opacity: 0.52,
                    mixBlendMode: 'screen' as const,
                    pointerEvents: 'none',
                  }}
                />
              </span>
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
          {[
            { href: '/', label: 'Home' },
            { href: '/projects', label: 'Projects' },
            { href: '/blog', label: 'Writing' },
            { href: '/about', label: 'About' },
            { href: '/contact', label: 'Contact' },
          ].map((item) => (
            <TransitionLink
              key={item.href}
              href={item.href}
              style={{
                minHeight: 44,
                display: 'inline-flex',
                alignItems: 'center',
                padding: '12px 18px',
              }}
            >
              {item.label}
            </TransitionLink>
          ))}
        </nav>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} {profile.name}
          </span>
          <span>
            {profile.role} · {profile.location} · Replies within one working day
          </span>
          <a
            href={profile.github}
            target="_blank"
            rel="noreferrer"
            style={{ minHeight: 44, display: 'inline-flex', alignItems: 'center' }}
          >
            GitHub <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
