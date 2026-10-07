import React, { useEffect, useRef } from 'react';
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type Variants,
} from 'motion/react';
import { ReedMode } from '../../types';
import { modeLabels, modePortraits } from './portraits';

type ReedCharacterSize = 'sm' | 'md' | 'lg' | 'xl';

interface ReedCharacterProps {
  mode: ReedMode;
  size?: ReedCharacterSize;
  className?: string;
  // Breathing, sleeping "z", hover tilt and the bend transition between modes.
  // Off by default so the small menu icons stay still.
  animated?: boolean;
}

// Fixed height, automatic width: the cut-out keeps its own proportions.
const sizeClasses: Record<ReedCharacterSize, string> = {
  sm: 'h-16',
  md: 'h-20',
  lg: 'h-32',
  xl: 'h-48',
};

const zSizeClasses: Record<ReedCharacterSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-xl',
};

// No translate classes here: motion writes its own transform on the animated shadow.
const shadowClasses =
  'pointer-events-none absolute bottom-0 left-1/2 h-[8%] w-[70%] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(64,46,24,0.28),transparent_70%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(236,230,216,0.18),transparent_70%)]';
const imgClasses =
  'relative h-full w-auto object-contain [filter:drop-shadow(0_2px_3px_rgba(64,46,24,0.18))] dark:[filter:drop-shadow(0_2px_4px_rgba(0,0,0,0.45))]';

// Timeline of a mode change: exit 180 ms, then the entry.
const EXIT_S = 0.18;
const ENTER_DELAY_S = 0.06;
const MAX_TILT_DEG = 3;
const FOCUS_TILT_DEG = 2;

// The reed that bends: the old character leans out from its feet, the new one straightens up.
const bendVariants: Variants = {
  initial: { opacity: 0, rotate: 8, scale: 0.92 },
  enter: {
    opacity: 1,
    rotate: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 260,
      damping: 18,
      delay: ENTER_DELAY_S,
      opacity: { duration: 0.2, ease: 'easeOut', delay: ENTER_DELAY_S },
    },
  },
  exit: { opacity: 0, rotate: -8, scale: 0.92, transition: { duration: EXIT_S, ease: 'easeIn' } },
};

// Reduced motion: no rotation, spring or breathing, just a 120 ms fade.
const fadeVariants: Variants = {
  initial: { opacity: 0 },
  enter: { opacity: 1, transition: { duration: 0.12 } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
};

const StaticCharacter: React.FC<Omit<ReedCharacterProps, 'animated'>> = ({ mode, size = 'md', className = '' }) => (
  <span className={`relative inline-flex flex-shrink-0 items-end justify-center ${sizeClasses[size]} ${className}`}>
    <span aria-hidden="true" className={`${shadowClasses} -translate-x-1/2 translate-y-1/3`} />
    <img
      src={modePortraits[mode]}
      alt={`Reed en modo ${modeLabels[mode].label}`}
      draggable={false}
      decoding="async"
      className={imgClasses}
    />
  </span>
);

const AnimatedCharacter: React.FC<Omit<ReedCharacterProps, 'animated'>> = ({ mode, size = 'md', className = '' }) => {
  const reduceMotion = useReducedMotion() ?? false;
  const rootRef = useRef<HTMLSpanElement>(null);
  const hovering = useRef(false);
  const focused = useRef(false);

  // One breathing value drives both the character and its contact shadow, so they stay in phase.
  const breath = useMotionValue(0);
  const breathSeconds = mode === 'sleeping' ? 6 : 4;
  useEffect(() => {
    if (reduceMotion) {
      breath.set(0);
      return;
    }
    const controls = animate(breath, [0, 1, 0], { duration: breathSeconds, ease: 'easeInOut', repeat: Infinity });
    return () => controls.stop();
  }, [breath, breathSeconds, reduceMotion]);
  const bodyY = useTransform(breath, [0, 1], [0, -2]);
  const bodyScaleY = useTransform(breath, [0, 1], [1, 1.015]);
  const shadowScaleX = useTransform(breath, [0, 1], [1, 0.9]);
  const shadowOpacity = useTransform(breath, [0, 1], [1, 0.75]);

  // Gentle lean toward the cursor, or a small fixed lean when the surrounding control has focus.
  const tiltTarget = useMotionValue(0);
  const tilt = useSpring(tiltTarget, { stiffness: 200, damping: 20 });

  useEffect(() => {
    const control = rootRef.current?.closest<HTMLElement>('button, a[href], [tabindex]');
    if (!control || reduceMotion) return;
    const onFocusIn = () => {
      focused.current = true;
      if (!hovering.current) tiltTarget.set(FOCUS_TILT_DEG);
    };
    const onFocusOut = () => {
      focused.current = false;
      if (!hovering.current) tiltTarget.set(0);
    };
    control.addEventListener('focusin', onFocusIn);
    control.addEventListener('focusout', onFocusOut);
    return () => {
      control.removeEventListener('focusin', onFocusIn);
      control.removeEventListener('focusout', onFocusOut);
    };
  }, [reduceMotion, tiltTarget]);

  const handlePointerMove = (e: React.PointerEvent<HTMLSpanElement>) => {
    if (reduceMotion || e.pointerType !== 'mouse') return;
    hovering.current = true;
    const rect = e.currentTarget.getBoundingClientRect();
    const offset = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    tiltTarget.set(Math.max(-1, Math.min(1, offset)) * MAX_TILT_DEG);
  };
  const handlePointerLeave = () => {
    hovering.current = false;
    tiltTarget.set(focused.current ? FOCUS_TILT_DEG : 0);
  };

  const showZs = mode === 'sleeping' && !reduceMotion;

  return (
    <motion.span
      ref={rootRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={{ rotate: reduceMotion ? 0 : tilt, originX: 0.5, originY: 1 }}
      className={`relative inline-flex flex-shrink-0 items-end justify-center ${sizeClasses[size]} ${className}`}
    >
      <motion.span
        aria-hidden="true"
        className={shadowClasses}
        style={{ x: '-50%', y: '33%', scaleX: shadowScaleX, opacity: shadowOpacity }}
      />

      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={mode}
          variants={reduceMotion ? fadeVariants : bendVariants}
          initial="initial"
          animate="enter"
          exit="exit"
          style={{ originX: 0.5, originY: 1 }}
          className="relative inline-flex h-full items-end justify-center"
        >
          <motion.span className="inline-flex h-full" style={{ y: bodyY, scaleY: bodyScaleY, originY: 1 }}>
            <img
              src={modePortraits[mode]}
              alt={`Reed en modo ${modeLabels[mode].label}`}
              draggable={false}
              decoding="async"
              className={imgClasses}
            />
          </motion.span>

          {showZs && (
            <span aria-hidden="true" className={`pointer-events-none absolute right-[4%] top-[6%] ${zSizeClasses[size]}`}>
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="absolute bottom-0 left-0 font-serif italic text-ink-muted"
                  initial={{ opacity: 0, y: 0, x: 0, scale: 0.6 }}
                  animate={{ opacity: [0, 1, 0], y: ['0%', '-160%'], x: ['0%', '60%'], scale: [0.6, 1.25] }}
                  transition={{ duration: 2.4, delay: i * 0.8, repeat: Infinity, ease: 'easeOut' }}
                >
                  z
                </motion.span>
              ))}
            </span>
          )}
        </motion.span>
      </AnimatePresence>
    </motion.span>
  );
};

// Reed drawn without a visible container: no background, border or clipping.
// A soft contact shadow under the feet keeps it floating on the page.
export const ReedCharacter: React.FC<ReedCharacterProps> = ({ animated = false, ...props }) =>
  animated ? <AnimatedCharacter {...props} /> : <StaticCharacter {...props} />;
