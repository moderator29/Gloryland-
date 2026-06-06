import { useEffect, useState } from "react";

type Props = {
  value: number;
  prefix?: string;
  decimals?: number;
  className?: string;
};

export function Odometer({ value, prefix = "", decimals = 0, className = "" }: Props) {
  const [target, setTarget] = useState(value);

  useEffect(() => {
    setTarget(value);
  }, [value]);

  const formatted = target.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  const chars = formatted.split("");

  return (
    <span className={`font-numeric inline-flex items-baseline ${className}`}>
      {prefix && <span className="mr-0.5">{prefix}</span>}
      {chars.map((ch, i) => {
        if (/\d/.test(ch)) {
          const n = parseInt(ch, 10);
          return (
            <span key={i} className="odometer-digit">
              <span
                style={{
                  transform: `translateY(-${n}em)`,
                }}
              >
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
                  <span key={d} style={{ display: "block", height: "1em" }}>
                    {d}
                  </span>
                ))}
              </span>
            </span>
          );
        }
        return <span key={i}>{ch}</span>;
      })}
    </span>
  );
}
