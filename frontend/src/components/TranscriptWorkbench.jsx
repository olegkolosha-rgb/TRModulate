import { useMemo, useState } from "react";
import { Search, Play, AlignLeft, ListOrdered } from "lucide-react";
import {
  getUtteranceSpeaker,
  getUtteranceEmotion,
  speakerStyle,
  speakerLabel,
  emotionLabel,
  emotionStyle,
} from "@/lib/transcript";
import { msToClock } from "@/lib/exporters";

export const TranscriptWorkbench = ({ record, onSeek }) => {
  const [tab, setTab] = useState("segments");
  const [query, setQuery] = useState("");

  const result = record?.result || {};
  const utterances = result.utterances || [];

  const filtered = useMemo(() => {
    if (!query.trim()) return utterances;
    const q = query.toLowerCase();
    return utterances.filter((u) => (u.text || "").toLowerCase().includes(q));
  }, [utterances, query]);

  const tabBtn = (id, label, Icon, testid) => (
    <button
      data-testid={testid}
      onClick={() => setTab(id)}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        tab === id
          ? "bg-primary text-primary-foreground"
          : "bg-secondary text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="w-4 h-4" /> {label}
    </button>
  );

  return (
    <div
      data-testid="transcript-workbench"
      className="rounded-2xl border border-border bg-card/60 overflow-hidden animate-fade-up"
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between p-4 border-b border-border">
        <div className="flex gap-2">
          {tabBtn("segments", "Сегменты", ListOrdered, "transcript-segments-tab")}
          {tabBtn("full", "Полный текст", AlignLeft, "transcript-full-text-tab")}
        </div>
        {tab === "segments" && (
          <div className="relative sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              data-testid="search-transcript-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по тексту..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-secondary border border-border text-sm outline-none focus:border-primary/50"
            />
          </div>
        )}
      </div>

      {tab === "full" ? (
        <div className="p-5 max-h-[520px] overflow-y-auto">
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
            {result.text || utterances.map((u) => u.text).join(" ") || "Нет текста."}
          </p>
        </div>
      ) : (
        <div className="p-3 sm:p-4 max-h-[520px] overflow-y-auto space-y-2">
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Ничего не найдено.
            </p>
          )}
          {filtered.map((utt, i) => {
            const sp = getUtteranceSpeaker(utt);
            const spStyle = speakerStyle(sp);
            const spLabel = speakerLabel(sp);
            const emo = getUtteranceEmotion(utt);
            const emoLabel = emotionLabel(emo);
            return (
              <div
                key={i}
                data-testid="transcript-segment-row"
                onClick={() => onSeek?.(utt.start_ms || 0)}
                className={`group rounded-xl border p-3 transition-all cursor-pointer hover:bg-accent/40 ${spStyle.border} bg-secondary/30`}
              >
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground group-hover:text-primary">
                    <Play className="w-3 h-3" />
                    {msToClock(utt.start_ms || 0)}
                  </span>
                  {spLabel && (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${spStyle.bg} ${spStyle.text} ${spStyle.border}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${spStyle.dot}`} />
                      {spLabel}
                    </span>
                  )}
                  {emoLabel && (
                    <span
                      className={`px-2 py-0.5 rounded-md text-xs font-medium border ${emotionStyle(emo)}`}
                    >
                      {emoLabel}
                    </span>
                  )}
                </div>
                <p className="text-sm leading-relaxed text-foreground/90">{utt.text}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
