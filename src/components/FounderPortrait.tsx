import portrait from "@/assets/image.png";
import { PortraitGlow } from "@/components/PortraitGlow";

type Props = {
  videoSrc?: string;
  size?: number;
};

export function FounderPortrait({ videoSrc, size = 112 }: Props) {
  return (
    <PortraitGlow>
      {videoSrc ? (
        <video
          src={videoSrc}
          poster={portrait}
          autoPlay
          loop
          muted
          playsInline
          width={size}
          height={size}
          className="h-full w-full object-cover"
        />
      ) : (
        <img
          src={portrait}
          alt="Emilia Clarke portrait"
          width={512}
          height={512}
          loading="eager"
          decoding="async"
          className="h-full w-full object-cover"
        />
      )}
    </PortraitGlow>
  );
}
