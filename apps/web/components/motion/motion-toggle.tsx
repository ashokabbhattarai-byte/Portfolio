'use client';
import { useEffect, useState } from 'react';
import { flow, flowEvent, setFlow, type Flow } from './flow';
/* Lets a visitor overrule the system preference in either direction. The
   system decides the default; this decides the session, and it is remembered. */
export function MotionToggle() {
  const [mode, setMode] = useState<Flow>('full');
  useEffect(() => {
    const sync = () => setMode(flow());
    sync();
    window.addEventListener(flowEvent, sync);
    return () => window.removeEventListener(flowEvent, sync);
  }, []);
  const full = mode === 'full';
  return (
    <button
      className="motion-toggle"
      onClick={() => setFlow(full ? 'calm' : 'full')}
      aria-pressed={!full}
      aria-label={full ? 'Reduce motion' : 'Restore full motion'}
      title={full ? 'Reduce motion' : 'Restore full motion'}
    >
      <span aria-hidden="true" suppressHydrationWarning>
        {full ? '◐' : '○'}
      </span>
    </button>
  );
}
