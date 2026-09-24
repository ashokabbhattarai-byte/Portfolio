'use client';

import { Player, type PlayerRef } from '@remotion/player';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { useCallback, useEffect, useRef } from 'react';

type FilmProps = { variant: 'process' | 'writing' };
const duration = 360;

function CraftComposition({ variant }: FilmProps) {
  const frame = useCurrentFrame();
  const writing = variant === 'writing';
  const labels = writing
    ? ['Observe', 'Connect', 'Share']
    : ['Discover', 'Develop', 'Deliver'];
  // Remotion loop: inline interpolate keyframes with Premium easing (0.4,0,0.2,1).
  const drift = interpolate(frame, [0, duration / 2, duration], [0, -10, 0], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const orbit = interpolate(frame, [0, duration], [0, 24], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const cardRotate = interpolate(frame, [0, duration / 2, duration], [-8, -2, -8], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill
      style={{
        background: '#0c213c',
        color: '#f4f3ee',
        fontFamily: 'Arial, sans-serif',
        overflow: 'hidden',
      }}
    >
      <AbsoluteFill
        style={{
          backgroundImage:
            'linear-gradient(#c7dca81c 1px, transparent 1px), linear-gradient(90deg,#c7dca81c 1px,transparent 1px)',
          backgroundSize: '80px 80px',
          opacity: 0.8,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 44,
          top: 34,
          fontSize: 12,
          letterSpacing: 3,
          color: '#b7c8bc',
        }}
      >
        {writing
          ? 'FIELD NOTES / AN OPEN NOTEBOOK'
          : 'CRAFT IN MOTION / THE DEVELOPMENT CYCLE'}
      </div>
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          style={{
            position: 'absolute',
            width: 310 + index * 70,
            height: 310 + index * 70,
            right: -35 - index * 35,
            top: 24 - index * 35,
            border: `1px solid ${index === 1 ? '#c7dca8' : '#a8bf8255'}`,
            borderRadius: '50%',
            rotate: `${orbit * 0.5 + index * 35}deg`,
            scale: interpolate(frame, [0, duration / 2, duration], [1, 1.035, 1], {
              easing: Easing.bezier(0.4, 0, 0.2, 1),
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: -5,
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#c7dca8',
              boxShadow: '0 0 14px #a8bf82',
            }}
          />
        </div>
      ))}
      <div
        style={{
          position: 'absolute',
          left: 44,
          top: 92,
          fontSize: 62,
          letterSpacing: -3,
          lineHeight: 1.04,
          fontWeight: 400,
        }}
      >
        {' '}
        {writing ? (
          <>
            Ideas,
            <br />
            <span style={{ color: '#c7dca8' }}>made clear.</span>
          </>
        ) : (
          <>
            Good things
            <br />
            <span style={{ color: '#c7dca8' }}>take craft.</span>
          </>
        )}
      </div>
      <div
        style={{
          position: 'absolute',
          right: 74,
          top: 106,
          width: 166,
          height: 174,
          borderRadius: 22,
          background: '#f4f3ee',
          color: '#0c213c',
          boxShadow: '0 22px 60px rgba(0,0,0,0.32)',
          rotate: `${cardRotate}deg`,
          translate: `0 ${drift}px`,
          padding: 24,
        }}
      >
        <div style={{ fontSize: 11, letterSpacing: 2, marginBottom: 18 }}>
          {writing ? 'A NOTE TO SELF' : 'BUILT WITH INTENT'}
        </div>
        <div style={{ fontSize: 33, letterSpacing: -2 }}>
          {writing ? 'Aa —' : '{ ab }'}
        </div>
        {[90, 68, 80].map((width, index) => (
          <div
            key={index}
            style={{
              width: `${width}%`,
              height: 3,
              background: '#0c213c',
              opacity: 0.18,
              marginTop: 13,
              scale: `${interpolate(frame, [0, duration / 2, duration], [0.9, 1, 0.9], {
                easing: Easing.bezier(0.4, 0, 0.2, 1),
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              })} 1`,
              transformOrigin: 'left',
            }}
          />
        ))}
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 35,
          left: 44,
          right: 44,
          display: 'flex',
          gap: 28,
          borderTop: '1px solid #ffffff30',
          paddingTop: 21,
        }}
      >
        {labels.map((label, index) => {
          const local = (frame + index * 120) % duration;
          const glow = interpolate(local, [0, 60, 120], [0.08, 0.32, 0.08], {
            easing: Easing.bezier(0.4, 0, 0.2, 1),
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          return (
            <div
              key={label}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                fontSize: 15,
                color: '#dce6d3',
              }}
            >
              <span
                style={{
                  width: 27,
                  height: 27,
                  border: '1px solid rgba(199,220,168,0.5)',
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 10,
                  background: `rgba(199,220,168,${glow})`,
                }}
              >
                0{index + 1}
              </span>
              {label}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

export default function CraftPlayer({
  variant,
  playing,
}: FilmProps & { playing: boolean }) {
  const player = useRef<PlayerRef>(null);
  const attachPlayer = useCallback(
    (instance: PlayerRef | null) => {
      player.current = instance;
      if (instance) {
        if (playing && !document.hidden) instance.play();
        else instance.pause();
      }
    },
    [playing],
  );
  useEffect(() => {
    const sync = () => {
      if (playing && !document.hidden) player.current?.play();
      else player.current?.pause();
    };
    // The Player establishes its timeline in child effects. Start on the next
    // frame so a lazy mount cannot reset an earlier imperative play request.
    const ready = requestAnimationFrame(sync);
    document.addEventListener('visibilitychange', sync);
    return () => {
      cancelAnimationFrame(ready);
      document.removeEventListener('visibilitychange', sync);
    };
  }, [playing]);
  return (
    <Player
      ref={attachPlayer}
      component={CraftComposition}
      inputProps={{ variant }}
      durationInFrames={duration}
      compositionWidth={800}
      compositionHeight={400}
      fps={30}
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
