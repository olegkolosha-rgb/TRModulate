export const SPEAKER_STYLES = [
  { bg: "bg-cyan-500/15", text: "text-cyan-400", border: "border-cyan-500/30", dot: "bg-cyan-400" },
  { bg: "bg-purple-500/15", text: "text-purple-400", border: "border-purple-500/30", dot: "bg-purple-400" },
  { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30", dot: "bg-emerald-400" },
  { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30", dot: "bg-amber-400" },
  { bg: "bg-rose-500/15", text: "text-rose-400", border: "border-rose-500/30", dot: "bg-rose-400" },
  { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/30", dot: "bg-blue-400" },
];

export function speakerStyle(speaker) {
  if (speaker === undefined || speaker === null) return SPEAKER_STYLES[0];
  const digits = String(speaker).match(/\d+/);
  const idx = digits ? parseInt(digits[0], 10) : 0;
  return SPEAKER_STYLES[idx % SPEAKER_STYLES.length];
}

export function speakerLabel(speaker) {
  if (speaker === undefined || speaker === null || speaker === "") return null;
  const digits = String(speaker).match(/\d+/);
  if (digits) return `Спикер ${parseInt(digits[0], 10) + 1}`;
  return String(speaker);
}

const EMOTION_RU = {
  neutral: "Нейтрально",
  happy: "Радость",
  joy: "Радость",
  sad: "Грусть",
  sadness: "Грусть",
  angry: "Гнев",
  anger: "Гнев",
  fearful: "Страх",
  fear: "Страх",
  surprised: "Удивление",
  surprise: "Удивление",
  disgust: "Отвращение",
  calm: "Спокойствие",
};

const EMOTION_STYLE = {
  neutral: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  happy: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  joy: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  sad: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  sadness: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  angry: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  anger: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  fearful: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  fear: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  surprised: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  surprise: "bg-amber-500/15 text-amber-400 border-amber-500/30",
};

export function emotionLabel(emotion) {
  if (!emotion) return null;
  const key = String(emotion).toLowerCase();
  return EMOTION_RU[key] || emotion;
}

export function emotionStyle(emotion) {
  const key = String(emotion || "").toLowerCase();
  return EMOTION_STYLE[key] || EMOTION_STYLE.neutral;
}

export function getUtteranceSpeaker(utt) {
  return utt.speaker ?? utt.speaker_id ?? utt.speaker_label ?? null;
}

export function getUtteranceEmotion(utt) {
  const e = utt.emotion ?? utt.emotion_label ?? utt.dominant_emotion;
  if (e && typeof e === "object") return e.label || e.name || null;
  return e || null;
}
