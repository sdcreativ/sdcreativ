"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0 },
};

const noMotionVariants: Variants = {
  hidden: { opacity: 1, y: 0 },
  visible: { opacity: 1, y: 0 },
};

type AnimatedSectionProps = {
  children: React.ReactNode;
  className?: string;
  id?: string;
  delay?: number;
};

export function AnimatedSection({
  children,
  className,
  id,
  delay = 0,
}: AnimatedSectionProps) {
  const reduceMotion = useReducedMotion();
  const variants = reduceMotion ? noMotionVariants : fadeUpVariants;

  return (
    <motion.section
      id={id}
      className={cn(className)}
      initial={reduceMotion ? false : "hidden"}
      whileInView={reduceMotion ? undefined : "visible"}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      variants={variants}
    >
      {children}
    </motion.section>
  );
}

type AnimatedCardProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
};

export function AnimatedCard({ children, className, delay = 0 }: AnimatedCardProps) {
  const reduceMotion = useReducedMotion();
  const variants = reduceMotion ? noMotionVariants : fadeUpVariants;

  return (
    <motion.div
      className={cn(className)}
      initial={reduceMotion ? false : "hidden"}
      whileInView={reduceMotion ? undefined : "visible"}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      variants={variants}
      whileHover={reduceMotion ? undefined : { y: -4, transition: { duration: 0.2 } }}
    >
      {children}
    </motion.div>
  );
}
