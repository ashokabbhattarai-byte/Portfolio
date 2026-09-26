'use client';

import { Player, type PlayerRef } from '@remotion/player';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { useEffect, useRef } from 'react';
import type { Skill } from '@portfolio/types';
import '@fontsource-variable/geist';

const duration = 600; // 10 seconds total loop @ 60fps

function SkillsComposition({ skills }: { skills: Skill[] }) {
  const frame = useCurrentFrame();

  const totalCategories = Math.max(1, skills.length);
  const framesPerCategory = duration / totalCategories;

  const activeIndex = Math.min(
    totalCategories - 1,
    Math.floor((frame % duration) / framesPerCategory),
  );
  const currentSkill = skills[activeIndex] ?? skills[0];
  const items = currentSkill
    ? currentSkill.items
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const phaseProgress = (frame % framesPerCategory) / framesPerCategory;

  // Smooth fade-in, sustain, and fade-out transition
  const opacity = interpolate(phaseProgress, [0, 0.12, 0.88, 1], [0, 1, 1, 0], {
    easing: Easing.bezier(0.22, 1, 0.36, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const translateY = interpolate(
    phaseProgress,
    [0, 0.12, 0.88, 1],
    [10, 0, 0, -10],
    {
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  );

  // Timeline progress (0 to 100%)
  const timelineProgress = interpolate(frame, [0, duration], [0, 100], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: '#0c0a09',
        color: '#fafaf9',
        fontFamily: '"Geist Variable", system-ui, -apple-system, sans-serif',
        overflow: 'hidden',
        padding: '36px 40px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {/* Subtle architectural grid pattern */}
      <AbsoluteFill
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
          opacity: 0.8,
          pointerEvents: 'none',
        }}
      />

      {/* Atmospheric warm accent gradient */}
      <div
        style={{
          position: 'absolute',
          top: '-20%',
          right: '-10%',
          width: '55%',
          height: '75%',
          background:
            'radial-gradient(circle, rgba(161, 98, 7, 0.18) 0%, transparent 70%)',
          filter: 'blur(40px)',
          pointerEvents: 'none',
        }}
      />

      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: '#a16207',
              boxShadow: '0 0 10px rgba(161, 98, 7, 0.6)',
            }}
          />
          <span
            style={{
              fontSize: 11,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#a8a29e',
              fontWeight: 600,
            }}
          >
            Engineering Stack & Focus
          </span>
        </div>

        <span
          style={{
            fontSize: 11,
            color: '#78716c',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '0.04em',
          }}
        >
          {String(activeIndex + 1).padStart(2, '0')} /{' '}
          {String(totalCategories).padStart(2, '0')}
        </span>
      </div>

      {/* Center Showcase: Animated Current Category & Real Tools */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          position: 'relative',
          zIndex: 2,
          opacity,
          transform: `translateY(${translateY}px)`,
        }}
      >
        <div>
          <span
            style={{
              fontSize: 12,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#fef08a',
              fontWeight: 500,
              display: 'block',
              marginBottom: 6,
            }}
          >
            Domain Focus
          </span>
          <h3
            style={{
              fontSize: 'clamp(26px, 3.2vw, 36px)',
              fontWeight: 600,
              letterSpacing: '-0.03em',
              margin: 0,
              color: '#fafaf9',
              lineHeight: 1.2,
            }}
          >
            {currentSkill?.name}
          </h3>
        </div>

        {/* Real tools displayed as clean, elegant badges */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            maxWidth: 680,
          }}
        >
          {items.map((item, idx) => {
            const itemDelay = idx * 0.03;
            const itemOpacity = interpolate(
              phaseProgress,
              [itemDelay, itemDelay + 0.1, 0.88, 1],
              [0, 1, 1, 0],
              {
                easing: Easing.bezier(0.22, 1, 0.36, 1),
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              },
            );

            return (
              <span
                key={item}
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  padding: '7px 14px',
                  borderRadius: 8,
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#e7e5e4',
                  letterSpacing: '-0.01em',
                  opacity: itemOpacity,
                }}
              >
                {item}
              </span>
            );
          })}
        </div>
      </div>

      {/* Bottom Timeline Rail */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          position: 'relative',
          zIndex: 2,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 11,
            color: '#78716c',
          }}
        >
          <span>Production-tested tooling</span>
          <span>Continuous cycle</span>
        </div>

        <div
          style={{
            height: 2,
            width: '100%',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: 999,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${timelineProgress}%`,
              background: '#fef08a',
              borderRadius: 999,
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
}

export default function SkillsPlayer({
  skills,
  playing,
}: {
  skills: Skill[];
  playing: boolean;
}) {
  const player = useRef<PlayerRef>(null);

  useEffect(() => {
    if (playing && player.current) {
      player.current.play();
    } else if (!playing && player.current) {
      player.current.pause();
    }

    const onVisibilityChange = () => {
      if (document.hidden && player.current) {
        player.current.pause();
      } else if (playing && player.current && !document.hidden) {
        player.current.play();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [playing]);

  return (
    <Player
      ref={(instance) => {
        player.current = instance;
        if (instance && playing) {
          instance.play();
        }
      }}
      component={SkillsComposition}
      inputProps={{ skills }}
      durationInFrames={duration}
      compositionWidth={800}
      compositionHeight={460}
      fps={60}
      loop
      autoPlay={playing}
      controls={false}
      clickToPlay={false}
      doubleClickToFullscreen={false}
      spaceKeyToPlayOrPause={false}
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        inset: 0,
      }}
    />
  );
}
