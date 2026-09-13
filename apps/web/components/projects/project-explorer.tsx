'use client';
import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import type { Project } from '@portfolio/types';
import { travels } from '@/components/motion/flow';
gsap.registerPlugin(Flip);
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
      duration: 0.7,
      ease: 'curtain',
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
  const visible = projects.filter(
    (p) => filter === 'All' || p.category === filter,
  );
  return (
    <>
      <div className="work-toolbar">
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
