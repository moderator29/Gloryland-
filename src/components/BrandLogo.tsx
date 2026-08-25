import crest from "@/assets/halcyon-crest.png";
import lockup from "@/assets/halcyon-lockup.png";
import { BRAND_NAME, BRAND_TAGLINE, BRAND_FULL } from "@/lib/site-config";

type MarkProps = {
  /** Rendered width in px. Height follows the crest's aspect ratio. */
  size?: number;
  className?: string;
  /** Soft gold aura behind the crest, for hero placements. */
  glow?: boolean;
};

/**
 * The Halcyon crest, lifted from the master logo with its white plate removed.
 * Used on its own wherever the wordmark would be too small to read.
 */
export function BrandMark({ size = 40, className = "", glow = false }: MarkProps) {
  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center ${className}`}
      style={{ width: size }}
    >
      {glow && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 scale-150"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, rgba(201,162,39,0.28), transparent 66%)",
            filter: "blur(10px)",
          }}
        />
      )}
      <img
        src={crest}
        alt={`${BRAND_FULL} crest`}
        width={size}
        className="block h-auto w-full select-none"
        draggable={false}
      />
    </span>
  );
}

type LockupProps = {
  /** Crest width in px. The wordmark scales from it. */
  size?: number;
  className?: string;
  /** Drops the INVESTMENTS sub-line on tight surfaces. */
  compact?: boolean;
  glow?: boolean;
};

/**
 * Crest above the wordmark, following the master lockup. The wordmark is set in
 * the app's display serif and filled with the brand gold rather than reusing the
 * logo's navy type, which would disappear against the dark UI.
 */
export function BrandLockup({
  size = 108,
  className = "",
  compact = false,
  glow = true,
}: LockupProps) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <BrandMark size={size} glow={glow} />
      <p
        className="font-display mt-3 leading-none text-gradient-gold"
        style={{ fontSize: size * 0.29, letterSpacing: "0.16em", paddingLeft: "0.16em" }}
      >
        {BRAND_NAME.toUpperCase()}
      </p>
      {!compact && (
        <div className="mt-2 flex items-center justify-center gap-2.5">
          <span className="h-px w-7 bg-gradient-to-r from-transparent to-primary/60" />
          <span
            className="whitespace-nowrap text-primary/90"
            style={{ fontSize: Math.max(8, size * 0.093), letterSpacing: "0.34em" }}
          >
            {BRAND_TAGLINE.toUpperCase()}
          </span>
          <span className="h-px w-7 bg-gradient-to-l from-transparent to-primary/60" />
        </div>
      )}
    </div>
  );
}

/**
 * The untouched master lockup, wordmark included. Only legible on a light
 * surface, so reserve it for printed or exported artefacts.
 */
export function BrandLockupImage({ width = 220, className = "" }) {
  return (
    <img
      src={lockup}
      alt={BRAND_FULL}
      width={width}
      className={`block h-auto select-none ${className}`}
      draggable={false}
    />
  );
}
