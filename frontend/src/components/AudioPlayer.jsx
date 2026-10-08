import { useRef, useState, useImperativeHandle, forwardRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";
import { msToClock } from "@/lib/exporters";

export const AudioPlayer = forwardRef(({ src, filename }, ref) => {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1);

  useImperativeHandle(ref, () => ({
    seek: (ms) => {
      if (audioRef.current) {
        audioRef.current.currentTime = (ms || 0) / 1000;
        audioRef.current.play();
        setPlaying(true);
      }
    },
  }));

  useEffect(() => {
    setPlaying(false);
    setCurrent(0);
  }, [src]);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) audioRef.current.pause();
    else audioRef.current.play();
    setPlaying(!playing);
  };

  const changeRate = () => {
    const rates = [1, 1.25, 1.5, 2, 0.75];
    const next = rates[(rates.indexOf(rate) + 1) % rates.length];
    setRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const pct = duration ? (current / duration) * 100 : 0;

  if (!src) return null;

  return (
    <div
      data-testid="audio-player-container"
      className="rounded-2xl border border-border bg-card/60 p-4 flex items-center gap-4"
    >
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={(e) => setCurrent(e.target.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.target.duration)}
        onEnded={() => setPlaying(false)}
      />
      <button
        data-testid="audio-player-play-btn"
        onClick={toggle}
        className="w-11 h-11 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:scale-105 transition-transform"
      >
        {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium truncate mb-1.5">{filename}</p>
        <div
          className="h-1.5 rounded-full bg-secondary cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            if (audioRef.current && duration) {
              audioRef.current.currentTime = ratio * duration;
            }
          }}
        >
          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between font-mono text-[10px] text-muted-foreground mt-1">
          <span>{msToClock(current * 1000)}</span>
          <span>{msToClock(duration * 1000)}</span>
        </div>
      </div>
      <button
        onClick={changeRate}
        className="shrink-0 px-2.5 py-1 rounded-lg bg-secondary border border-border text-xs font-mono hover:bg-accent"
      >
        {rate}x
      </button>
    </div>
  );
});
