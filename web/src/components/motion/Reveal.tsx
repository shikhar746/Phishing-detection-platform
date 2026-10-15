"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";

/** Fades and lifts its children into view once, when scrolled into the viewport. */
export function Reveal({
  delay = 0,
  y = 18,
  as = "div",
  children,
  ...rest
}: HTMLMotionProps<"div"> & { delay?: number; y?: number; as?: "div" | "li" }) {
  const reduce = useReducedMotion();
  // motion.li and motion.div share props at runtime; the cast keeps one prop type.
  const Tag = (as === "li" ? motion.li : motion.div) as typeof motion.div;
  return (
    <Tag
      initial={{ opacity: 0, y: reduce ? 0 : y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Hover lift for cards. */
export function Lift({ children, ...rest }: HTMLMotionProps<"div">) {
  const reduce = useReducedMotion();
  return (
    <motion.div whileHover={reduce ? undefined : { y: -4 }} transition={{ type: "spring", stiffness: 300, damping: 24 }} {...rest}>
      {children}
    </motion.div>
  );
}
