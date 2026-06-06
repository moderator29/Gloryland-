import { motion, useMotionValue, useSpring } from "framer-motion";
import { Link } from "react-router-dom";
import { useRef, type ReactNode, type MouseEvent } from "react";

type CommonProps = {
  children: ReactNode;
  className?: string;
  strength?: number;
};

type ButtonProps = CommonProps & {
  as?: "button";
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  type?: "button" | "submit";
};

type LinkProps = CommonProps & {
  as: "link";
  to: string;
};

type Props = ButtonProps | LinkProps;

const MotionLink = motion(Link);

export function MagneticButton(props: Props) {
  const { children, className = "", strength = 16 } = props;
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 18, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 220, damping: 18, mass: 0.4 });

  const handleMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    x.set((dx / r.width) * strength);
    y.set((dy / r.height) * strength);
  };
  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      className="inline-block"
    >
      {props.as === "link" ? (
        <MotionLink
          to={props.to}
          style={{ x: sx, y: sy }}
          whileTap={{ scale: 0.96 }}
          className={className}
        >
          {children}
        </MotionLink>
      ) : (
        <motion.button
          type={props.type ?? "button"}
          onClick={(e) => props.onClick?.(e as unknown as MouseEvent<HTMLButtonElement>)}
          disabled={props.disabled}
          style={{ x: sx, y: sy }}
          whileTap={{ scale: 0.96 }}
          className={className}
        >
          {children}
        </motion.button>
      )}
    </div>
  );
}
