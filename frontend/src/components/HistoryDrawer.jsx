import { useEffect, useState } from "react";
import axios from "axios";
import { Clock, FileAudio, Download, Trash2, Loader2, Eye } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { generateSRT, generateTXT, downloadBlob, msToClock } from "@/lib/exporters";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const fmtDate = (iso) => {
  try {
    return new Date(iso).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

export const HistoryDrawer = ({ open, onOpenChange, onView, refreshKey }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/history`);
      setItems(data);
    } catch (e) {
      toast.error("Не удалось загрузить историю");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load();
  }, [open, refreshKey]);

  const fetchFull = async (id) => {
    const { data } = await axios.get(`${API}/history/${id}`);
    return data;
  };

  const handleView = async (id) => {
    setBusyId(id);
    try {
      const full = await fetchFull(id);
      onView(full);
      onOpenChange(false);
    } catch {
      toast.error("Ошибка загрузки записи");
    } finally {
      setBusyId(null);
    }
  };

  const handleDownload = async (id, kind) => {
    setBusyId(id);
    try {
      const full = await fetchFull(id);
      const base = (full.filename || "transcript").replace(/\.[^.]+$/, "");
      if (kind === "txt") downloadBlob(generateTXT(full.result), `${base}.txt`);
      if (kind === "srt")
        downloadBlob(generateSRT(full.result.utterances || []), `${base}.srt`);
      if (kind === "json")
        downloadBlob(JSON.stringify(full.result, null, 2), `${base}.json`, "application/json");
    } catch {
      toast.error("Ошибка скачивания");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id) => {
    setBusyId(id);
    try {
      await axios.delete(`${API}/history/${id}`);
      setItems((prev) => prev.filter((x) => x.id !== id));
      toast.success("Запись удалена");
    } catch {
      toast.error("Ошибка удаления");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        data-testid="history-drawer"
        className="w-full sm:max-w-md bg-card border-border overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle className="font-heading flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" /> История транскрибаций
          </SheetTitle>
          <SheetDescription>
            Прошлые транскрибации — просмотр и скачивание в TXT, SRT и JSON.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-3">
          {loading && (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}

          {!loading && items.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-10">
              Пока нет сохранённых транскрибаций.
            </p>
          )}

          {items.map((item) => (
            <div
              key={item.id}
              data-testid="history-item-row"
              className="rounded-xl border border-border bg-secondary/40 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 shrink-0 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
                  <FileAudio className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{item.filename}</p>
                  <p className="font-mono text-[11px] text-muted-foreground mt-0.5">
                    {fmtDate(item.created_at)} · {item.segment_count} сегм. ·{" "}
                    {msToClock(item.duration_ms)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 mt-3">
                <button
                  data-testid="history-view-button"
                  onClick={() => handleView(item.id)}
                  disabled={busyId === item.id}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20"
                >
                  {busyId === item.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                  Открыть
                </button>
                {["txt", "srt", "json"].map((k) => (
                  <button
                    key={k}
                    onClick={() => handleDownload(item.id, k)}
                    disabled={busyId === item.id}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-mono uppercase bg-secondary border border-border hover:bg-accent"
                  >
                    {k}
                  </button>
                ))}
                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={busyId === item.id}
                  className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center bg-secondary border border-border hover:bg-destructive/20 hover:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};
