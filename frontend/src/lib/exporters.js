export function msToSrtTime(ms) {
  const totalSeconds = ms / 1000.0;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);
  const millis = Math.floor((totalSeconds - Math.floor(totalSeconds)) * 1000);
  const p = (n, l = 2) => String(n).padStart(l, "0");
  return `${p(hours)}:${p(minutes)}:${p(secs)},${p(millis, 3)}`;
}

export function msToClock(ms) {
  const totalSeconds = Math.floor((ms || 0) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function splitSentences(text) {
  const spaced = text.replace(/([.!?])(\S)/g, "$1 $2");
  const parts = spaced
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts : [text.trim()];
}

export function generateSRT(utterances) {
  let out = "";
  let idx = 1;
  for (let i = 0; i < utterances.length; i++) {
    const utt = utterances[i];
    const text = (utt.text || "").trim();
    if (!text) continue;

    const start = utt.start_ms || 0;
    let end = utt.end_ms || 0;
    if (end === 0) {
      end = i + 1 < utterances.length ? utterances[i + 1].start_ms || start + 3000 : start + 3000;
      if (end <= start) end = start + 3000;
    }

    const sentences = splitSentences(text);
    let duration = end - start;
    if (duration <= 0) duration = 3000;
    const segDur = duration / sentences.length;

    sentences.forEach((sent, j) => {
      const sStart = Math.floor(start + j * segDur);
      const sEnd = Math.floor(start + (j + 1) * segDur);
      out += `${idx}\n${msToSrtTime(sStart)} --> ${msToSrtTime(sEnd)}\n${sent}\n\n`;
      idx += 1;
    });
  }
  return out;
}

export function generateTXT(result) {
  if (result.text && result.text.trim()) return result.text;
  const utts = result.utterances || [];
  return utts.map((u) => (u.text || "").trim()).filter(Boolean).join("\n");
}

export function downloadBlob(content, filename, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
