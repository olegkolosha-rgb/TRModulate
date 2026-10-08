import { useMemo, useState } from "react";
import { Search, Play, AlignLeft, ListOrdered, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import {
  getUtteranceSpeaker,
  getUtteranceEmotion,
  speakerStyle,
  speakerLabel,
  emotionLabel,
  emotionStyle,
} from "@/lib/transcript";
import { msToClock } from "@/lib/exporters";

const copyText = async (text, onDone) => {
  try {
    await navigator.clipboard.writeText(text || "");
    toast.success("Скопировано");
    onDone?.();
  } catch {
    toast.error("Не удалось скопировать");
  }
};

export const TranscriptWorkbench = ({ record, onSeek, currentMs = -1 }) => {
  const [tab, setTab] = useState("segments");
  const [query, setQuery] = useState("");
  const [copiedFull, setCopiedFull] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(null);

  const result = record?.result || {};
  const utterances = result.utterances || [];

  const fullText = result.text || utterances.map((u) => u.text).join(" ");

  const filtered = useMemo(() => {
    if (!query.trim()) return utterances;
    const q = query.toLowerCase();
    return utterances.filter((u) => (u.text || "").toLowerCase().includes(q));
  }, [utterances, query]);

  // Determine which segment is active for the current playback time.
  const activeStart = useMemo(() => {
    if (currentMs < 0 || !utterances.length) return null;
    for (let i = 0; i < utterances.length; i++) {
      const start = utterances[i].start_ms || 0;
      let end = utterances[i].end_ms || 0;
      if (!end) end = i + 1 < utterances.length ? utterances[i + 1].start_ms || start : start + 3000;
      if (currentMs >= start && currentMs < end) return start;
    }
    return null;
  }, [currentMs, utterances]);

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
        {tab === "segments" ? (
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
        ) : (
          <button
            data-testid="copy-full-text-button"
            onClick={() => copyText(fullText, () => {
              setCopiedFull(true);
              setTimeout(() => setCopiedFull(false), 1500);
            })}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-secondary hover:bg-accent border border-border transition-colors"
          >
            {copiedFull ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
            Скопировать
          </button>
        )}
      </div>

      {tab === "full" ? (
        <div className="p-5 max-h-[520px] overflow-y-auto">
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
            {fullText || "Нет текста."}
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
            const isActive = activeStart !== null && (utt.start_ms || 0) === activeStart;
            return (
              <div
                key={i}
                data-testid="transcript-segment-row"
                data-active={isActive ? "true" : "false"}
                onClick={() => onSeek?.(utt.start_ms || 0)}
                className={`group relative rounded-xl border p-3 transition-all cursor-pointer ${spStyle.border} ${
                  isActive
                    ? "bg-primary/10 ring-2 ring-primary/50 border-primary/50"
                    : "bg-secondary/30 hover:bg-accent/40"
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-3 bottom-3 w-1 rounded-r bg-primary" />
                )}
                <div className="flex flex-wrap items-center gap-2 mb-1.5 pr-9">
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
                <button
                  data-testid="copy-segment-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyText(utt.text, () => {
                      setCopiedIdx(i);
                      setTimeout(() => setCopiedIdx((c) => (c === i ? null : c)), 1500);
                    });
                  }}
                  className="absolute top-2.5 right-2.5 w-7 h-7 rounded-lg flex items-center justify-center bg-secondary/80 border border-border opacity-0 group-hover:opacity-100 hover:bg-accent transition-opacity"
                  title="Скопировать сегмент"
                >
                  {copiedIdx === i ? (
                    <Check className="w-3.5 h-3.5 text-primary" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
