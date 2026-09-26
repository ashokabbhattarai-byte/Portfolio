'use client';

import { Player, type PlayerRef } from '@remotion/player';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { useCallback, useEffect, useRef } from 'react';
import '@fontsource-variable/geist';

type FilmProps = { variant: 'process' | 'writing' };
const duration = 720;

function CraftComposition({ variant }: FilmProps) {
  const frame = useCurrentFrame();
  const writing = variant === 'writing';
  const labels = writing
    ? ['Observe', 'Connect', 'Share']
    : ['Discover', 'Develop', 'Deliver'];

  // Smooth floating & orbit interpolation curves (Remotion standard)
  const drift = interpolate(frame, [0, duration / 2, duration], [0, -14, 0], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const cardRotate = interpolate(
    frame,
    [0, duration / 2, duration],
    [-6, -1, -6],
    {
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  );

  const primaryOrbit = interpolate(frame, [0, duration], [0, 360], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const secondaryOrbit = interpolate(frame, [0, duration], [360, 0], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Pulse sonar wave expanding from orbit center
  const sonarPhase = frame % 240;
  const sonarScale = interpolate(sonarPhase, [0, 240], [0.6, 1.8], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const sonarOpacity = interpolate(sonarPhase, [0, 80, 240], [0.4, 0.2, 0], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Cursor blink for code card
  const cursorOpacity = Math.floor((frame % 80) / 40) === 0 ? 1 : 0.1;

  // Footer timeline traveling dot position (%)
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
      }}
    >
      {/* Dynamic Grid Background with Subtle Shift */}
      <AbsoluteFill
        style={{
          backgroundImage: `
            linear-gradient(rgba(161, 98, 7, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(161, 98, 7, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '70px 70px',
          opacity: 0.85,
          translate: `0 ${interpolate(frame, [0, duration], [0, 70], {
            easing: Easing.linear,
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })}px`,
        }}
      />

      {/* Atmospheric Radial Lighting Mesh */}
      <div
        style={{
          position: 'absolute',
          top: -80,
          right: -80,
          width: 500,
          height: 500,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(161, 98, 7, 0.25) 0%, rgba(12, 10, 9, 0) 70%)',
          pointerEvents: 'none',
          scale: interpolate(frame, [0, duration / 2, duration], [1, 1.15, 1], {
            easing: Easing.bezier(0.4, 0, 0.2, 1),
            output: 'perceptual-scale',
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -100,
          left: -100,
          width: 450,
          height: 450,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(254, 240, 138, 0.12) 0%, rgba(12, 10, 9, 0) 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Top Left Header Badge */}
      <div
        style={{
          position: 'absolute',
          left: 44,
          top: 32,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 11,
          letterSpacing: 3,
          color: '#d6d3d1',
          fontWeight: 700,
          textTransform: 'uppercase',
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: '#a16207',
            boxShadow: '0 0 10px #a16207',
          }}
        />
        {writing
          ? 'FIELD NOTES / AN OPEN NOTEBOOK'
          : 'CRAFT IN MOTION / THE DEVELOPMENT CYCLE'}
      </div>

      {/* Multi-Layered Orbital Engine */}
      <div
        style={{
          position: 'absolute',
          right: 40,
          top: -10,
          width: 440,
          height: 440,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Sonar Shockwave */}
        <div
          style={{
            position: 'absolute',
            width: 240,
            height: 240,
            borderRadius: '50%',
            border: '1.5px solid #a16207',
            scale: sonarScale,
            opacity: sonarOpacity,
          }}
        />

        {/* Orbit Ring 1 (Outer - Clockwise) */}
        <div
          style={{
            position: 'absolute',
            width: 380,
            height: 380,
            borderRadius: '50%',
            border: '1px stroke rgba(161, 98, 7, 0.25)',
            borderStyle: 'dashed',
            rotate: `${primaryOrbit * 0.3}deg`,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '12%',
              left: '12%',
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#fef08a',
              boxShadow: '0 0 12px #fef08a',
            }}
          />
        </div>

        {/* Orbit Ring 2 (Middle Primary - Counter-Clockwise) */}
        <div
          style={{
            position: 'absolute',
            width: 300,
            height: 300,
            borderRadius: '50%',
            border: '1.5px solid rgba(161, 98, 7, 0.55)',
            rotate: `${secondaryOrbit * 0.5}deg`,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -6,
              left: '50%',
              translate: '-50% 0',
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: '#a16207',
              boxShadow: '0 0 16px #a16207, 0 0 30px rgba(161,98,7,0.7)',
            }}
          />
        </div>

        {/* Orbit Ring 3 (Inner - Clockwise) */}
        <div
          style={{
            position: 'absolute',
            width: 220,
            height: 220,
            borderRadius: '50%',
            border: '1px solid rgba(161, 98, 7, 0.35)',
            rotate: `${primaryOrbit * 0.8}deg`,
          }}
        >
          <div
            style={{
              position: 'absolute',
              bottom: '15%',
              right: '15%',
              width: 9,
              height: 9,
              borderRadius: '50%',
              background: '#d97706',
              boxShadow: '0 0 10px #d97706',
            }}
          />
        </div>
      </div>

      {/* Main Headline */}
      <div
        style={{
          position: 'absolute',
          left: 44,
          top: 88,
          fontSize: 60,
          letterSpacing: -2.5,
          lineHeight: 1.06,
          fontWeight: 500,
        }}
      >
        {writing ? (
          <>
            Ideas,
            <br />
            <span
              style={{
                background: 'linear-gradient(135deg, #fef08a 0%, #a16207 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              made clear.
            </span>
          </>
        ) : (
          <>
            Good things
            <br />
            <span
              style={{
                background: 'linear-gradient(135deg, #fef08a 0%, #a16207 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              take craft.
            </span>
          </>
        )}
      </div>

      {/* Floating Glassmorphic Code/Craft Card */}
      <div
        style={{
          position: 'absolute',
          right: 64,
          top: 96,
          width: 184,
          height: 194,
          borderRadius: 20,
          background: 'linear-gradient(145deg, #1c1917, #0c0a09)',
          color: '#fafaf9',
          boxShadow:
            '0 25px 50px -12px rgba(0, 0, 0, 0.65), 0 0 1px rgba(255,255,255,0.2)',
          rotate: `${cardRotate}deg`,
          translate: `0 ${drift}px`,
          padding: 22,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              letterSpacing: 2,
              fontWeight: 800,
              color: '#78716c',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>{writing ? 'NOTE TO SELF' : 'BUILT WITH INTENT'}</span>
            <span style={{ color: '#a8a29e', fontSize: 10 }}>✦</span>
          </div>

          <div
            style={{
              fontSize: 32,
              letterSpacing: -1.5,
              fontWeight: 600,
              fontFamily: 'monospace',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            {writing ? 'Aa' : '{ ab }'}
            <span
              style={{
                width: 3,
                height: 28,
                background: '#fafaf9',
                opacity: cursorOpacity,
                display: 'inline-block',
                marginLeft: 2,
              }}
            />
          </div>
        </div>

        {/* Animated Skeleton Progress Lines */}
        <div style={{ marginTop: 'auto' }}>
          {[88, 64, 76].map((widthPercent, index) => {
            const lineShift = interpolate(
              (frame + index * 40) % 360,
              [0, 180, 360],
              [0.92, 1, 0.92],
              {
                easing: Easing.bezier(0.4, 0, 0.2, 1),
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              },
            );
            return (
              <div
                key={index}
                style={{
                  width: `${widthPercent}%`,
                  height: 3.5,
                  borderRadius: 2,
                  background: 'rgba(250, 250, 249, 0.15)',
                  marginTop: 10,
                  scale: `${lineShift} 1`,
                  transformOrigin: 'left',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'linear-gradient(90deg, transparent, rgba(250, 250, 249, 0.35), transparent)',
                    translate: `${interpolate(
                      (frame * 2 + index * 80) % 400,
                      [0, 400],
                      [-100, 100],
                      {
                        easing: Easing.linear,
                        extrapolateLeft: 'clamp',
                        extrapolateRight: 'clamp',
                      },
                    )}% 0`,
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Particles Dust */}
      {[0, 1, 2, 3, 4].map((i) => {
        const particleX = (i * 140 + frame * (0.4 + i * 0.1)) % 750;
        const particleY = 40 + Math.sin(frame * 0.03 + i) * 25 + i * 45;
        const particleOpacity = interpolate(
          particleX,
          [0, 100, 650, 750],
          [0, 0.4, 0.4, 0],
          {
            easing: Easing.linear,
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          },
        );
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: particleX,
              top: particleY,
              width: 3 + (i % 2),
              height: 3 + (i % 2),
              borderRadius: '50%',
              background: i % 2 === 0 ? '#a16207' : '#fef08a',
              opacity: particleOpacity,
              pointerEvents: 'none',
            }}
          />
        );
      })}

      {/* Bottom Development Cycle Bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '20px 44px 28px 44px',
          background:
            'linear-gradient(to top, rgba(12, 10, 9, 0.95), transparent)',
          borderTop: '1px solid rgba(255, 255, 255, 0.12)',
        }}
      >
        {/* Traveling Progress Accent Line */}
        <div
          style={{
            position: 'absolute',
            top: -1,
            left: 0,
            width: `${timelineProgress}%`,
            height: 2,
            background: 'linear-gradient(90deg, #fef08a, #a16207)',
            boxShadow: '0 0 10px #a16207',
          }}
        />

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 20,
          }}
        >
          {labels.map((label, index) => {
            const stepDuration = duration / labels.length;
            const activeStep = Math.floor((frame % duration) / stepDuration);
            const isActive = activeStep === index;

            const glow = isActive
              ? interpolate(
                  frame % stepDuration,
                  [0, stepDuration / 2, stepDuration],
                  [0.35, 0.65, 0.35],
                  {
                    easing: Easing.bezier(0.4, 0, 0.2, 1),
                    extrapolateLeft: 'clamp',
                    extrapolateRight: 'clamp',
                  },
                )
              : 0.08;

            return (
              <div
                key={label}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? '#fafaf9' : '#d6d3d1',
                  scale: isActive ? '1.02' : '1',
                  transformOrigin: 'left',
                }}
              >
                <span
                  style={{
                    width: 28,
                    height: 28,
                    border: `1px solid ${isActive ? '#fef08a' : 'rgba(161, 98, 7, 0.3)'}`,
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 11,
                    fontWeight: 600,
                    color: isActive ? '#fef08a' : '#a8a29e',
                    background: `rgba(161, 98, 7, ${glow})`,
                    boxShadow: isActive
                      ? '0 0 14px rgba(161, 98, 7, 0.4)'
                      : 'none',
                  }}
                >
                  0{index + 1}
                </span>
                {label}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
}

export default function CraftPlayer({
  variant,
  playing,
}: FilmProps & { playing: boolean }) {
  const player = useRef<PlayerRef>(null);
  useEffect(() => {
    if (playing && player.current) {
      player.current.seekTo(0);
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
      component={CraftComposition}
      inputProps={{ variant }}
      durationInFrames={duration}
      compositionWidth={800}
      compositionHeight={400}
      fps={60}
      loop
      autoPlay={playing}
      controls={false}
      clickToPlay={false}
      doubleClickToFullscreen={false}
      spaceKeyToPlayOrPause={false}
      style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
    />
  );
}
