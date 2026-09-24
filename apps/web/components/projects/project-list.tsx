'use client';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { travels, watchFlow } from '@/components/motion/flow';
import { TransitionLink } from '@/components/motion/transition-link';
import { ProjectArt } from './project-art';
import type { Project } from '@portfolio/types';

gsap.registerPlugin(ScrollTrigger);

/* Scoped under [data-projects-list] so the landing and journal lists that
   share .project-entry keep their own styling. Mirrors the landing card
   language: white 22px cards, green hover border, 44px arrow that keeps
   rotate(45deg) on hover. (The rotate(0deg) override lives in globals.css —
   this later, more specific rule wins without touching that file.) */
const listStyles = `
[data-projects-list] .project-title h3{font-size:clamp(28px,3.5vw,52px);color:#0c213c;letter-spacing:-0.05em}
[data-projects-list] .project-context,[data-projects-list] .project-category{font-size:15px}
[data-projects-list].grid .project-entry{background:#fff;border:1px solid rgba(12,33,60,0.1);border-radius:22px;padding:26px;transition:transform .6s cubic-bezier(0.16,1,0.3,1),box-shadow .6s cubic-bezier(0.16,1,0.3,1),border-color .3s ease,color .35s ease}
[data-projects-list].grid .project-entry:hover{transform:translateY(-7px);border-color:#527747;box-shadow:0 18px 36px rgba(23,59,56,0.12);color:#527747}
[data-projects-list].grid .project-thumbnail{border-radius:22px;overflow:hidden;border:1px solid rgba(12,33,60,0.1)}
[data-projects-list] .project-arrow{width:44px;height:44px;display:grid;place-items:center;border-radius:50%;background:#f4f3ee;border:1px solid #c8d1df;font-size:16px!important;transition:background .34s cubic-bezier(0.16,1,0.3,1),color .34s cubic-bezier(0.16,1,0.3,1),border-color .34s cubic-bezier(0.16,1,0.3,1),transform .52s cubic-bezier(0.16,1,0.3,1)}
[data-projects-list] .project-entry:hover .project-arrow{background:#527747;color:#fff;border-color:#527747;transform:rotate(45deg) scale(1.06);box-shadow:0 8px 20px rgba(82,119,71,0.32)}
[data-projects-list] .project-entry:focus-visible{outline:3px solid #527747;outline-offset:4px}
[data-projects-list].grid .project-entry:active{transform:translateY(-2px)}
@media (hover:none){[data-projects-list] .project-entry:active{color:#527747}[data-projects-list].grid .project-entry:active{transform:translateY(-2px)}}
@media (max-width:760px){[data-projects-list].grid{grid-template-columns:1fr}[data-projects-list] .project-context,[data-projects-list] .project-category{font-size:15px}}
@media (max-width:480px){[data-projects-list].grid .project-entry{padding:20px}}
@media (max-width:360px){[data-projects-list].grid .project-entry{padding:18px}}
[data-flow='calm'] [data-projects-list] .project-entry:hover,[data-flow='calm'] [data-projects-list] .project-entry:hover .project-arrow,[data-flow='calm'] [data-projects-list].grid .project-entry:hover .project-art{transform:none}
@media (prefers-reduced-motion:reduce){[data-projects-list] .project-entry,[data-projects-list] .project-art,[data-projects-list] .project-arrow{transition:none!important}[data-projects-list] .project-entry:hover,[data-projects-list] .project-entry:hover .project-arrow,[data-projects-list].grid .project-entry:hover .project-art{transform:none}}
`;
export function ProjectList({
  projects,
  mode = 'list',
}: {
  projects: Project[];
  mode?: 'list' | 'grid';
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let context: gsap.Context | undefined;
    let reveal: (() => void) | undefined;
    const arm = () => {
      const root = ref.current;
      if (root && reveal) root.removeEventListener('focusin', reveal);
      reveal = undefined;
      context?.revert();
      if (!root) return;
      context = gsap.context(() => {
        if (!travels()) return;
        const entries = root.querySelectorAll(':scope > .project-entry');
        if (!entries.length) return;
        const compact = window.matchMedia('(max-width: 760px)').matches;
        /* Landing entrance language: y:34, power3.out, 0.85s, ScrollTrigger
           once at 'top 94%', plus a focusin fallback for keyboard visitors.
           Mount-only — Flip in ProjectExplorer owns filter/mode changes. */
        const tween = gsap.from(entries, {
          y: compact ? 18 : 34,
          opacity: 0,
          duration: 0.85,
          ease: 'power3.out',
          stagger: 0.08,
          clearProps: 'opacity,transform',
          scrollTrigger: { trigger: root, start: 'top 94%', once: true },
        });
        reveal = () => {
          tween.progress(1);
        };
        root.addEventListener('focusin', reveal);
      }, root);
    };
    arm();
    const stop = watchFlow(arm);
    return () => {
      stop();
      const root = ref.current;
      if (root && reveal) root.removeEventListener('focusin', reveal);
      context?.revert();
    };
  }, []);
  return (
    <>
      <style>{listStyles}</style>
      <div ref={ref} className={`project-collection ${mode}`} data-projects-list>
        <div className="work-columns utility">
          <span>Project</span>
          <span>Discipline</span>
          <span>View</span>
        </div>
        {projects.map((project) => (
          <TransitionLink
            href={`/projects/${project.slug}`}
            key={project.slug}
            className="project-entry"
            data-project={project.slug}
            data-flip-id={project.slug}
            data-preview={mode === 'list' ? 'media' : 'cursor'}
            aria-label={`${project.title} — ${project.category} project. ${project.summary}`}
          >
            <div className="project-thumbnail">
              <ProjectArt project={project} />
            </div>
            <div className="project-title">
              <h3>{project.title}</h3>
              <span className="project-context">{project.context}</span>
            </div>
            <span className="project-category">{project.category}</span>
            <span className="project-arrow" aria-hidden="true">
              ↗
            </span>
          </TransitionLink>
        ))}
      </div>
    </>
  );
}
