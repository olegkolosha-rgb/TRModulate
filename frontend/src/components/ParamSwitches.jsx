import { Users, Smile, Mic2, ShieldAlert, EyeOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const OPTIONS = [
  {
    key: "speaker_diarization",
    testid: "switch-diarization",
    label: "Диаризация спикеров",
    desc: "Определять, кто говорит",
    icon: Users,
  },
  {
    key: "emotion_signal",
    testid: "switch-emotions",
    label: "Сигнал эмоций",
    desc: "Эмоциональная окраска речи",
    icon: Smile,
  },
  {
    key: "accent_signal",
    testid: "switch-accent",
    label: "Определение акцента",
    desc: "Анализ акцента говорящего",
    icon: Mic2,
  },
  {
    key: "deepfake_signal",
    testid: "switch-deepfake",
    label: "Детекция дипфейков",
    desc: "Выявление синтезированной речи",
    icon: ShieldAlert,
  },
  {
    key: "pii_phi_tagging",
    testid: "switch-pii-redaction",
    label: "Теги PII / PHI",
    desc: "Отметка персональных данных",
    icon: EyeOff,
  },
];

export const ParamSwitches = ({ params, setParams, disabled }) => {
  return (
    <div
      data-testid="modulate-params-card"
      className="rounded-2xl border border-border bg-card/60 p-5"
    >
      <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground mb-4">
        Параметры Velma-2
      </div>
      <div className="space-y-2">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = params[opt.key];
          return (
            <div
              key={opt.key}
              className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                active ? "border-primary/40 bg-primary/5" : "border-border bg-secondary/40"
              }`}
            >
              <div
                className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center border ${
                  active
                    ? "bg-primary/15 border-primary/30 text-primary"
                    : "bg-secondary border-border text-muted-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-tight">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </div>
              <Switch
                data-testid={opt.testid}
                checked={active}
                disabled={disabled}
                onCheckedChange={(v) => setParams((p) => ({ ...p, [opt.key]: v }))}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
