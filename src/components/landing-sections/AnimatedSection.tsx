import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useRef, type ReactNode } from 'react';
import type { SectionAnimation } from '@/lib/landing-sections/types';

const VARIANTS: Record<string, { hidden: any; show: any }> = {
  none:         { hidden: {},                                show: {} },
  fade:         { hidden: { opacity: 0 },                    show: { opacity: 1 } },
  'slide-up':   { hidden: { opacity: 0, y: 40 },             show: { opacity: 1, y: 0 } },
  'slide-left': { hidden: { opacity: 0, x: -50 },            show: { opacity: 1, x: 0 } },
  'slide-right':{ hidden: { opacity: 0, x: 50 },             show: { opacity: 1, x: 0 } },
  zoom:         { hidden: { opacity: 0, scale: 0.92 },       show: { opacity: 1, scale: 1 } },
  'blur-in':    { hidden: { opacity: 0, filter: 'blur(14px)' }, show: { opacity: 1, filter: 'blur(0px)' } },
  'mask-reveal':{ hidden: { opacity: 0, clipPath: 'inset(0 0 100% 0)' }, show: { opacity: 1, clipPath: 'inset(0 0 0% 0)' } },
};

const EASE: Record<string, any> = {
  ease:   [0.4, 0, 0.2, 1],
  linear: 'linear',
  spring: { type: 'spring', stiffness: 90, damping: 18 },
  bounce: { type: 'spring', stiffness: 220, damping: 12 },
};

export function AnimatedSection({
  animation,
  children,
}: {
  animation?: SectionAnimation;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const parallax = animation?.parallax ?? 0;
  const y = useTransform(scrollYProgress, [0, 1], [0, -100 * parallax]);

  if (!animation || animation.entrance === 'none' || reduce) {
    return <div ref={ref}>{children}</div>;
  }

  const variant = VARIANTS[animation.entrance] ?? VARIANTS.fade;
  const easing = EASE[animation.easing ?? 'ease'];
  const duration = (animation.duration ?? 600) / 1000;
  const delay = (animation.delay ?? 0) / 1000;
  const isSpring = typeof easing === 'object' && (easing as any).type;
  const transition = isSpring ? { ...easing, delay } : { duration, delay, ease: easing };

  const motionProps: any =
    animation.trigger === 'on-load'
      ? { initial: 'hidden', animate: 'show' }
      : animation.trigger === 'on-hover'
      ? { initial: 'hidden', whileHover: 'show' }
      : { initial: 'hidden', whileInView: 'show', viewport: { once: !animation.repeat, amount: 0.2 } };

  return (
    <motion.div
      ref={ref}
      variants={variant}
      transition={transition}
      style={parallax ? { y } : undefined}
      {...motionProps}
    >
      {children}
    </motion.div>
  );
}
