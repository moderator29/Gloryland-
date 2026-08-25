import { useState } from "react";
import { Gift, Copy, Check, Share2 } from "lucide-react";
import { toast } from "sonner";
import { generateReferralLink } from "@/hooks/useReferral";
import { playTap } from "@/lib/sound";
import { tap as haptic } from "@/lib/haptic";
import { BRAND_FULL } from "@/lib/site-config";

export function ReferralCard() {
  const [copied, setCopied] = useState(false);
  const link = generateReferralLink();

  const copy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    playTap();
    haptic();
    toast.success("Invite link copied.", { duration: 1600 });
    setTimeout(() => setCopied(false), 1600);
  };

  const share = async () => {
    haptic();
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${BRAND_FULL} Portal`,
          text: "Invest in music royalties. Earn every day.",
          url: link,
        });
      } catch {
        /* ignore */
      }
    } else {
      copy();
    }
  };

  return (
    <div className="glass-luxury aurora-border p-5">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-[#B3902F]/30 via-[#F4E3AC]/15 to-[#A07C22]/30 ring-1 ring-primary/40">
          <Gift className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="font-display text-xl">
            Earn <em className="not-italic text-gradient-gold">15%</em> per invite
          </p>
          <p className="text-xs text-muted-foreground">Share your link. Earn from every deposit.</p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-2xl border border-border/60 bg-black/40 px-3 py-2.5">
        <code className="flex-1 truncate font-mono text-xs text-muted-foreground">{link}</code>
        <button
          onClick={copy}
          className="grid h-8 w-8 place-items-center rounded-full bg-primary/15 text-primary"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={share}
          className="grid h-8 w-8 place-items-center rounded-full bg-primary/15 text-primary"
        >
          <Share2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
