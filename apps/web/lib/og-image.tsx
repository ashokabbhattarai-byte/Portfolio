import { ImageResponse } from 'next/og';
import type { Profile } from '@portfolio/types';
export function socialImage(
  title: string,
  subtitle: string,
  profile?: Profile,
) {
  const name = profile?.name ?? 'Ashok Bhattarai';
  const location = profile?.location ?? 'Nepal';
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#0c213c',
        color: '#f4f3ee',
        padding: 70,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 25,
        }}
      >
        <span>ab. / {name}</span>
        <span>{location} ↗</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <span
          style={{ fontSize: title.length > 22 ? 76 : 100, letterSpacing: -5 }}
        >
          {title}
        </span>
        <span style={{ fontSize: 28, color: '#b7c8bc' }}>{subtitle}</span>
      </div>
      <div style={{ height: 5, width: 140, background: '#527747' }} />
    </div>,
    { width: 1200, height: 630 },
  );
}
