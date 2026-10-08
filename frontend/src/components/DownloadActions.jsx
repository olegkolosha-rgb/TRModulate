import { FileText, Captions, Braces } from "lucide-react";
import { generateSRT, generateTXT, downloadBlob } from "@/lib/exporters";

export const DownloadActions = ({ record }) => {
  const result = record?.result || {};
  const base = (record?.filename || "transcript").replace(/\.[^.]+$/, "");

  const downloadTxt = () => downloadBlob(generateTXT(result), `${base}.txt`);
  const downloadSrt = () =>
    downloadBlob(generateSRT(result.utterances || []), `${base}.srt`);
  const downloadJson = () =>
    downloadBlob(JSON.stringify(result, null, 2), `${base}.json`, "application/json");

  const btn =
    "flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all hover:-translate-y-0.5";

  return (
    <div data-testid="download-actions" className="flex flex-col sm:flex-row gap-2">
      <button
        data-testid="download-txt-button"
        onClick={downloadTxt}
        className={`${btn} bg-secondary hover:bg-accent border-border`}
      >
        <FileText className="w-4 h-4" /> TXT
      </button>
      <button
        data-testid="download-srt-button"
        onClick={downloadSrt}
        className={`${btn} bg-secondary hover:bg-accent border-border`}
      >
        <Captions className="w-4 h-4" /> SRT
      </button>
      <button
        data-testid="download-json-button"
        onClick={downloadJson}
        className={`${btn} bg-primary/10 hover:bg-primary/20 border-primary/30 text-primary`}
      >
        <Braces className="w-4 h-4" /> JSON
      </button>
    </div>
  );
};
