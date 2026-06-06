import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Compass, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-5 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="glass-luxury aurora-border w-full max-w-md p-8 text-center"
      >
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-[#FFD700]/40 via-[#FFF7C2]/20 to-[#B8842B]/40 ring-1 ring-primary/40">
          <Compass className="h-7 w-7 text-primary" strokeWidth={1.6} />
        </div>
        <h1 className="font-numeric mt-5 text-6xl text-gradient-gold">404</h1>
        <h2 className="font-display mt-2 text-2xl">Lost in the vault</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you tried to reach is not part of the portal yet.
        </p>
        <Link
          to="/"
          className="btn-foil mt-6 inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>
      </motion.div>
    </div>
  );
}
