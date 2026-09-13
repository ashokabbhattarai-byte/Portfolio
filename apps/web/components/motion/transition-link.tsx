'use client';
import Link from 'next/link';
import { useContext, type ComponentProps } from 'react';
import { MotionContext } from './motion-provider';
export function TransitionLink({
  href,
  children,
  onClick,
  ...props
}: ComponentProps<typeof Link>) {
  const motion = useContext(MotionContext);
  return (
    <Link
      href={href}
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (
          event.defaultPrevented ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          event.button !== 0 ||
          props.target === '_blank'
        )
          return;
        const target = typeof href === 'string' ? href : href.pathname;
        if (target?.startsWith('/') && !target.includes('#')) {
          event.preventDefault();
          motion.navigate(target);
        }
      }}
    >
      {children}
    </Link>
  );
}
