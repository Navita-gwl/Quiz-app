interface PublicLayoutProps {
  children: React.ReactNode;
  hideSupportEmail?: boolean;
}

export default function PublicLayout({ children, hideSupportEmail = false }: PublicLayoutProps) {
  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans">
      {/* Main Content Container */}
      <main className="flex-grow max-w-3xl w-full mx-auto px-4 py-12 md:py-16">
        {children}
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-slate-200 py-8 bg-slate-50">
        <div
          className={
            hideSupportEmail
              ? "max-w-3xl mx-auto px-4 text-sm text-slate-500 text-center"
              : "max-w-3xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-slate-500"
          }
        >
          &copy; {new Date().getFullYear()} QuizInsights. All rights reserved.
          {!hideSupportEmail && (
            <div>
              Support:{" "}
              <a href="mailto:support@galaxyweblinks.com" className="text-slate-700 hover:text-slate-900 underline font-medium">
                support@galaxyweblinks.com
              </a>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
