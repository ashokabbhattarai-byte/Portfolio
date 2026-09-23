'use client';

import { useEffect, useRef } from 'react';
import styles from './circuit-backdrop.module.css';
import { circuitField, type CircuitOptions } from './circuit-field';

/**
 * Decorative circuit board behind a dark section. Purely presentational: the
 * section's own content is untouched and stays readable with this removed.
 *
 * Pointer handling lives in the engine, which needs the cursor in the same
 * coordinate space it paints in.
 */
export function CircuitBackdrop({
  density,
  seed,
  className = '',
}: CircuitOptions & { className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!host.current) return;
    return circuitField(host.current, { density, seed });
  }, [density, seed]);
  return (
    <div
      ref={host}
      aria-hidden="true"
      data-warm="false"
      className={`${styles.backdrop} ${className}`}
    />
  );
}
