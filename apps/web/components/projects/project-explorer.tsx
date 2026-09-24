'use client';
import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Project } from '@portfolio/types';
import { travels, watchFlow } from '@/components/motion/flow';
gsap.registerPlugin(Flip, ScrollTrigger);
import { ProjectList } from './project-list';
const filters = ['All', 'Full stack', 'AI', 'Blockchain'] as const;
type Filter = (typeof filters)[number];
export function ProjectExplorer({
  projects,
  initialTab = 'All',
}: {
  projects: Project[];
  initialTab?: Filter;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState<Filter>(initialTab as Filter);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const layoutState = useRef<ReturnType<typeof Flip.getState> | null>(null);
  const capture = () => {
    if (travels()) layoutState.current = Flip.getState('.project-entry');
  };
  const [mode, setMode] = useState<'list' | 'grid'>('list');
  useEffect(() => {
    const urlTab = searchParams.get('tab');
    if (
      urlTab &&
      (filters as readonly string[]).includes(urlTab) &&
      urlTab !== filter
    ) {
      setFilter(urlTab as Filter);
    }
  }, [searchParams, filter]);
  const pushTab = (next: Filter) => {
    capture();
    setFilter(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'All') params.delete('tab');
    else params.set('tab', next);
    const qs = params.toString();
    router.push(`/projects${qs ? `?${qs}` : ''}`, { scroll: false });
  };
  useLayoutEffect(() => {
    if (!layoutState.current) return;
    const animation = Flip.from(layoutState.current, {
      targets: '.project-entry',
      duration: 0.85,
      ease: 'power3.out',
      absolute: true,
      scale: true,
      prune: true,
      stagger: 0.03,
    });
    layoutState.current = null;
    return () => {
      animation.kill();
    };
  }, [mode, filter]);
  /* Mount stagger for the toolbar controls (entries reveal in ProjectList):
     landing entrance language with a focusin fallback for keyboard users. */
  useEffect(() => {
    let context: gsap.Context | undefined;
    let reveal: (() => void) | undefined;
    const arm = () => {
      const toolbar = toolbarRef.current;
      if (toolbar && reveal) toolbar.removeEventListener('focusin', reveal);
      reveal = undefined;
      context?.revert();
      if (!toolbar) return;
      context = gsap.context(() => {
        if (!travels()) return;
        const controls = toolbar.querySelectorAll(
          '.filters button, .view-controls button',
        );
        if (!controls.length) return;
        const tween = gsap.from(controls, {
          y: 34,
          opacity: 0,
          duration: 0.85,
          ease: 'power3.out',
          stagger: 0.08,
          clearProps: 'opacity,transform',
          scrollTrigger: { trigger: toolbar, start: 'top 94%', once: true },
        });
        reveal = () => {
          tween.progress(1);
        };
        toolbar.addEventListener('focusin', reveal);
      }, toolbar);
    };
    arm();
    const stop = watchFlow(arm);
    return () => {
      stop();
      const toolbar = toolbarRef.current;
      if (toolbar && reveal) toolbar.removeEventListener('focusin', reveal);
      context?.revert();
    };
  }, []);
  const visible = projects.filter(
    (p) => filter === 'All' || p.category === filter,
  );
  return (
    <>
      <style>{`@media (max-width:900px){.work-toolbar[data-explorer]{flex-wrap:wrap}}@media (max-width:760px){.work-toolbar[data-explorer] .filters button{font-size:16px;min-height:44px}}.work-toolbar[data-explorer] button:focus-visible{outline:3px solid #527747;outline-offset:3px}@media (prefers-reduced-motion:reduce){.work-toolbar[data-explorer] button{transition:none!important}}`}</style>
      <div className="work-toolbar" data-explorer ref={toolbarRef}>
        <div className="filters" aria-label="Filter projects by discipline">
          {filters.map((name) => (
            <button
              key={name}
              aria-pressed={filter === name}
              onClick={() => pushTab(name as Filter)}
              aria-label={
                name === 'All'
                  ? 'Show every project'
                  : `Show ${name} projects only`
              }
            >
              {name}
              {name === 'All' && <sup>{projects.length}</sup>}
            </button>
          ))}
        </div>
        <div className="view-controls" aria-label="Project layout">
          <button
            onClick={() => {
              capture();
              setMode('list');
            }}
            aria-pressed={mode === 'list'}
            aria-label="Show projects as a list"
          >
            <span aria-hidden="true">☰</span>
          </button>
          <button
            onClick={() => {
              capture();
              setMode('grid');
            }}
            aria-pressed={mode === 'grid'}
            aria-label="Show projects as a grid"
          >
            <span aria-hidden="true">▦</span>
          </button>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {visible.length} {visible.length === 1 ? 'project' : 'projects'} shown
        in {mode} view
      </p>
      <h2 className="sr-only">
        {filter === 'All' ? 'All projects' : `${filter} projects`}
      </h2>
      <ProjectList projects={visible} mode={mode} />
    </>
  );
}
