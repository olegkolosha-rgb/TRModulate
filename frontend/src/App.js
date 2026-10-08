import { useEffect, useRef, useState } from "react";
import "@/App.css";
import axios from "axios";
import { Loader2, Sparkles, Zap, AlertTriangle, Timer, Hash } from "lucide-react";
import { Toaster, toast } from "sonner";
import { Header } from "@/components/Header";
import { UploadZone } from "@/components/UploadZone";
import { ParamSwitches } from "@/components/ParamSwitches";
import { TranscriptWorkbench } from "@/components/TranscriptWorkbench";
import { DownloadActions } from "@/components/DownloadActions";
import { HistoryDrawer } from "@/components/HistoryDrawer";
import { AudioPlayer } from "@/components/AudioPlayer";
import { Progress } from "@/components/ui/progress";
import { msToClock } from "@/lib/exporters";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STAGES = [
  "Подготовка файла...",
  "Извлечение и сжатие аудио...",
  "Отправка в Modulate Velma-2...",
  "Транскрибация и анализ речи...",
];

export default function App() {
  const [theme, setTheme] = useState("dark");
  const [file, setFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [params, setParams] = useState({
    speaker_diarization: true,
    emotion_signal: true,
    accent_signal: false,
    deepfake_signal: false,
    pii_phi_tagging: false,
  });
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState(STAGES[0]);
  const [record, setRecord] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentMs, setCurrentMs] = useState(0);
  const playerRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") root.classList.add("light");
    else root.classList.remove("light");
  }, [theme]);

  const handleFile = (f) => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setFile(f);
    setRecord(null);
    if (f) setAudioUrl(URL.createObjectURL(f));
    else setAudioUrl(null);
  };

  const runProgress = () => {
    setProgress(8);
    setStage(STAGES[0]);
    let p = 8;
    const id = setInterval(() => {
      p = Math.min(p + Math.random() * 7, 94);
      setProgress(p);
      if (p < 25) setStage(STAGES[0]);
      else if (p < 45) setStage(STAGES[1]);
      else if (p < 60) setStage(STAGES[2]);
      else setStage(STAGES[3]);
    }, 700);
    return id;
  };

  const transcribe = async () => {
    if (!file) {
      toast.error("Сначала выберите файл");
      return;
    }
    if (pollRef.current) clearTimeout(pollRef.current);
    setProcessing(true);
    setRecord(null);
    const progressId = runProgress();

    const finishOk = (rec) => {
      clearInterval(progressId);
      setProgress(100);
      setStage("Готово");
      setRecord(rec);
      setRefreshKey((k) => k + 1);
      toast.success("Транскрибация завершена");
      setTimeout(() => setProcessing(false), 400);
    };
    const finishErr = (msg) => {
      clearInterval(progressId);
      setProgress(0);
      toast.error(msg || "Ошибка при транскрибации");
      setProcessing(false);
    };

    try {
      const form = new FormData();
      form.append("file", file);
      Object.entries(params).forEach(([k, v]) => form.append(k, v ? "true" : "false"));

      const { data } = await axios.post(`${API}/transcribe`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const jobId = data.job_id;

      const poll = async () => {
        try {
          const { data: job } = await axios.get(`${API}/jobs/${jobId}`);
          if (job.status === "done") {
            finishOk(job.record);
          } else if (job.status === "error") {
            finishErr(job.error);
          } else {
            pollRef.current = setTimeout(poll, 2500);
          }
        } catch (err) {
          pollRef.current = setTimeout(poll, 4000);
        }
      };
      poll();
    } catch (e) {
      const detail = e?.response?.data?.detail || "Ошибка при отправке файла";
      finishErr(detail);
    }
  };

  const viewFromHistory = (full) => {
    setRecord(full);
    setFile(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    toast.info("Запись загружена из истории");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSeek = (ms) => playerRef.current?.seek(ms);

  return (
    <div className="App min-h-screen">
      <Toaster position="top-center" theme={theme} richColors />
      <Header
        onOpenHistory={() => setHistoryOpen(true)}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
      />
      <HistoryDrawer
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        onView={viewFromHistory}
        refreshKey={refreshKey}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Hero line */}
        <div className="animate-fade-up">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Транскрибация речи{" "}
            <span className="text-primary">с анализом эмоций</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            Загрузите аудио или видео — Modulate Velma-2 распознает речь, разделит
            спикеров и определит эмоции. Скачивайте результат в TXT, SRT и JSON.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left / main */}
          <div className="lg:col-span-8 space-y-6">
            <UploadZone file={file} onFile={handleFile} disabled={processing} />

            {audioUrl && (
              <AudioPlayer
                ref={playerRef}
                src={audioUrl}
                filename={file?.name}
                onTime={setCurrentMs}
              />
            )}

            {processing && (
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  <span className="font-medium text-sm">{stage}</span>
                  <span className="ml-auto font-mono text-sm text-primary">
                    {Math.round(progress)}%
                  </span>
                </div>
                <Progress
                  data-testid="processing-progress-bar"
                  value={progress}
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground mt-3">
                  Крупные файлы автоматически сжимаются. Обработка может занять
                  несколько минут.
                </p>
              </div>
            )}

            {record && !processing && (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary border border-border text-sm">
                    <Timer className="w-4 h-4 text-primary" />
                    <span className="font-mono">
                      {msToClock(record.result?.duration_ms || record.duration_ms)}
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary border border-border text-sm">
                    <Hash className="w-4 h-4 text-primary" />
                    <span className="font-mono">
                      {(record.result?.utterances || []).length} сегментов
                    </span>
                  </div>
                  <div className="ml-auto w-full sm:w-auto sm:min-w-[320px]">
                    <DownloadActions record={record} />
                  </div>
                </div>
                <TranscriptWorkbench
                  record={record}
                  onSeek={handleSeek}
                  currentMs={audioUrl ? currentMs : -1}
                />
              </>
            )}

            {!record && !processing && (
              <div className="rounded-2xl border border-dashed border-border bg-card/30 p-10 text-center">
                <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Результат транскрибации появится здесь.
                </p>
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <ParamSwitches params={params} setParams={setParams} disabled={processing} />

            <button
              data-testid="transcribe-submit-button"
              onClick={transcribe}
              disabled={processing || !file}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-heading font-semibold text-base bg-primary text-primary-foreground hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
            >
              {processing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Обработка...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" /> Транскрибировать
                </>
              )}
            </button>

            <div className="rounded-2xl border border-border bg-card/40 p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Поддерживаются аудио и видео. Из видео извлекается звук, большие
                  файлы сжимаются перед отправкой. При ошибке «слишком большой файл»
                  битрейт понижается автоматически.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
