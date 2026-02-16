import type { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
  panel: ReactNode;
}

export function AuthLayout({ children, panel }: AuthLayoutProps) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Left — form column */}
      <div className="flex flex-col bg-background animate-in fade-in slide-in-from-bottom-4 duration-500">
        {children}
        <footer className="px-6 pb-5 md:px-10">
          <div className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground/70">
            <span>MiWang v1.0</span>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              className="hover:text-foreground transition-colors"
              onClick={() => {}}
            >
              지원 센터
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              className="hover:text-foreground transition-colors"
              onClick={() => {}}
            >
              서비스 상태
            </button>
          </div>
        </footer>
      </div>

      {/* Right — value panel (hidden on mobile) */}
      <div className="relative hidden lg:block overflow-hidden animate-in fade-in slide-in-from-right-4 duration-700 delay-150">
        {panel}
      </div>
    </div>
  );
}
