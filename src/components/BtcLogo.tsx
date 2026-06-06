type Props = {
  size?: number;
  className?: string;
};

export function BtcLogo({ size = 36, className = "" }: Props) {
  return (
    <span
      aria-hidden
      className={`relative inline-grid shrink-0 place-items-center rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg, #f7931a 0%, #ffb347 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4), 0 4px 12px -2px rgba(247,147,26,0.5)",
      }}
    >
      <svg
        viewBox="0 0 32 32"
        width={size * 0.62}
        height={size * 0.62}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <path
          fill="#ffffff"
          d="M21.66 14.36c.3-2-.91-3.1-2.57-3.83l.54-2.17-1.32-.33-.53 2.12c-.35-.09-.7-.17-1.06-.25l.53-2.13-1.32-.33-.54 2.17c-.28-.06-.56-.13-.83-.2v-.01l-1.82-.45-.35 1.41s.98.22.96.24c.54.13.63.49.62.77l-.62 2.47c.04.01.09.02.14.04l-.14-.03-.86 3.46c-.07.16-.23.41-.61.31.02.02-.96-.24-.96-.24l-.66 1.51 1.72.43c.32.08.63.16.94.24l-.55 2.2 1.32.33.54-2.17c.36.1.71.19 1.05.27l-.54 2.16 1.32.33.55-2.19c2.25.43 3.95.26 4.66-1.78.57-1.64-.03-2.59-1.22-3.21.87-.2 1.52-.77 1.7-1.94zm-3.04 4.23c-.41 1.64-3.17.75-4.07.53l.73-2.92c.9.22 3.78.67 3.35 2.39zm.41-4.26c-.37 1.49-2.67.74-3.42.55l.66-2.65c.75.19 3.16.54 2.76 2.1z"
        />
      </svg>
    </span>
  );
}
