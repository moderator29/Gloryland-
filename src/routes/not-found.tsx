import { Link } from "react-router-dom";
import { ArrowLeft, Compass } from "lucide-react";
import { Wordmark } from "@/components/brand/Mark";
import { Ambience } from "@/components/shell/Ambience";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--ink-000)] px-5">
      <Ambience />
      <div className="panel-hi edge-light relative z-10 w-full max-w-md p-8 text-center">
        <Wordmark size={26} stacked />
        <span className="mx-auto mt-7 grid h-12 w-12 place-items-center rounded-2xl border border-[var(--line-hi)] bg-[rgba(46,139,255,0.08)]">
          <Compass className="h-5 w-5 text-[var(--accent-hi)]" strokeWidth={1.7} />
        </span>
        <p className="metric mt-5 text-4xl">404</p>
        <h1 className="mt-2 text-lg font-semibold text-[var(--text-hi)]">
          Nothing at this address
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-low)]">
          The page you were looking for has moved or never existed.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link to="/app" className="btn btn-primary">
            <ArrowLeft className="h-4 w-4" /> Back to portal
          </Link>
          <Link to="/" className="btn btn-outline">
            Public site
          </Link>
        </div>
      </div>
    </div>
  );
}
