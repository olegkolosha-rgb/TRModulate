import { AudioWaveform, History, Sun, Moon, Settings2 } from "lucide-react";

const Bars = () => (
  <div className="flex items-end gap-[2px] h-5" aria-hidden>
    {[0, 1, 2, 3, 4].map((i) => (
      <span
        key={i}
        className="w-[3px] rounded-full bg-primary origin-bottom"
        style={{
          height: "100%",
          animation: `pulse-bar 1.1s ease-in-out ${i * 0.13}s infinite`,
        }}
      />
    ))}
  </div>
);

export const Header = ({ onOpenHistory, theme, onToggleTheme }) => {
  return (
    <header
      data-testid="header-nav"
      className="sticky top-0 z-40 glass border-b border-border"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 border border-primary/30">
            <Bars />
          </div>
          <div className="leading-tight">
            <div className="font-heading font-bold text-base sm:text-lg tracking-tight flex items-center gap-2">
              Modulate <span className="text-primary">Velma-2</span>
              <AudioWaveform className="w-4 h-4 text-primary/70" />
            </div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Speech-to-Text Studio
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            data-testid="history-open-button"
            onClick={onOpenHistory}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-secondary hover:bg-accent border border-border transition-colors"
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">История</span>
          </button>
          <button
            data-testid="theme-toggle-button"
            onClick={onToggleTheme}
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-secondary hover:bg-accent border border-border transition-colors"
            title="Сменить тему"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
