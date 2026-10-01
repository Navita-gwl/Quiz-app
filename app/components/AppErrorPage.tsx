import { AlertCircle } from "lucide-react";

interface AppErrorPageProps {
  message: string;
  homeHref?: string;
  homeLabel?: string;
}

export function AppErrorPage({
  message,
  homeHref = "/app",
  homeLabel = "Return to dashboard",
}: AppErrorPageProps) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6 bg-slate-50/50">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h1 className="text-lg font-bold text-slate-900 mb-2">Something went wrong</h1>
        <p className="text-sm text-slate-600 leading-relaxed mb-6">{message}</p>
        {homeHref ? (
          <a
            href={homeHref}
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 transition-colors"
          >
            {homeLabel}
          </a>
        ) : null}
      </div>
    </div>
  );
}
