import type { Profile } from '@portfolio/types';
import { TransitionLink } from '@/components/motion/transition-link';
import { Magnetic } from '@/components/motion/magnetic';
import { Reveal } from '@/components/motion/reveal';
/* The three stages carry the left column. Previously it held a heading and a
   single micro line, which left most of the section empty at desktop widths —
   the hairline rows borrow the project list's row language so the page reads
   as one system from here down. */
const stages = [
  {
    step: '01',
    title: 'Define',
    detail:
      'Start at the constraint, not the stack. Scope the problem, the people it affects and the edge cases, then agree what “done” actually means.',
  },
  {
    step: '02',
    title: 'Build',
    detail:
      'Typed, accessible full-stack delivery in slices that ship — data model, API and interface moving together rather than in sequence.',
  },
  {
    step: '03',
    title: 'Assure',
    detail:
      'Quality assurance inside the build, not after it. Manual and automated checks on every release so performance and correctness hold in production.',
  },
];
export function Intro({ profile }: { profile: Profile }) {
  const firstName = profile.name.split(' ')[0];
  return (
    <section className="intro section-shell" aria-labelledby="approach-title">
      <Reveal className="intro-main">
        <p className="section-label">Approach</p>
        <h2 id="approach-title">
          Engineered with intent,
          <br />
          <span className="intro-accent">shipped with proof.</span>
        </h2>
        <p className="intro-lead">
          I build software that has to survive contact with real users — public
          products, internal tools and AI features that stay fast because
          quality is part of the work rather than a phase at the end.
        </p>
        <ol className="intro-ladder">
          {stages.map((stage) => (
            <li className="intro-step" key={stage.step}>
              <span className="intro-step-index" aria-hidden="true">
                {stage.step}
              </span>
              <h3>{stage.title}</h3>
              <p>{stage.detail}</p>
            </li>
          ))}
        </ol>
      </Reveal>
      <Reveal className="intro-aside">
        <p className="intro-bio">{profile.description}</p>
        <dl className="intro-meta">
          <div>
            <dt>Role</dt>
            <dd>{profile.role}</dd>
          </div>
          <div>
            <dt>Based in</dt>
            <dd>{profile.location}</dd>
          </div>
          {profile.languages ? (
            <div>
              <dt>Languages</dt>
              <dd>{profile.languages}</dd>
            </div>
          ) : null}
          <div>
            <dt>Availability</dt>
            <dd>Open to new projects</dd>
          </div>
        </dl>
        <Magnetic>
          <TransitionLink
            href="/about"
            className="round-button"
            aria-label={`Read more about ${profile.name}, ${profile.role}`}
          >
            About {firstName} <span aria-hidden="true">↗</span>
          </TransitionLink>
        </Magnetic>
      </Reveal>
    </section>
  );
}
