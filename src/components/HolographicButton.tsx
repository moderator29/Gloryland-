import { useRef, type ReactNode, type MouseEvent } from "react";

type Props = {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
};

export function HolographicButton({ children, onClick, className = "" }: Props) {
  const ref = useRef<HTMLButtonElement>(null);

  const handleMove = (e: MouseEvent<HTMLButtonElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 200;
    const y = ((e.clientY - r.top) / r.height) * 200;
    el.style.setProperty("--holo-x", `${x}%`);
    el.style.setProperty("--holo-y", `${y}%`);
  };
  const reset = () => {
    const el = ref.current;
    el?.style.setProperty("--holo-x", "0%");
    el?.style.setProperty("--holo-y", "50%");
  };

  return (
    <button
      ref={ref}
      onClick={onClick}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      className={`btn-holographic ${className}`}
    >
      {children}
    </button>
  );
}
