import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Loader2,
  RotateCcw,
  Save,
  Settings as SettingsIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { IndicatorConfig } from "../backend.d.ts";
import {
  useGetIndicatorConfig,
  useSaveIndicatorConfig,
} from "../hooks/useQueries";

interface FormValues {
  rsiPeriod: number;
  rsiOverbought: number;
  rsiOversold: number;
  stochasticKPeriod: number;
  stochasticDPeriod: number;
  stochasticOverbought: number;
  stochasticOversold: number;
  macdShortPeriod: number;
  macdLongPeriod: number;
  macdSignalPeriod: number;
  minConfidence: number;
  timeframe: string;
}

const DEFAULT_FORM: FormValues = {
  rsiPeriod: 14,
  rsiOverbought: 70,
  rsiOversold: 30,
  stochasticKPeriod: 14,
  stochasticDPeriod: 3,
  stochasticOverbought: 80,
  stochasticOversold: 20,
  macdShortPeriod: 12,
  macdLongPeriod: 26,
  macdSignalPeriod: 9,
  minConfidence: 75,
  timeframe: "1M",
};

function configToForm(config: IndicatorConfig): FormValues {
  return {
    rsiPeriod: Number(config.rsiPeriod),
    rsiOverbought: Number(config.rsiOverbought),
    rsiOversold: Number(config.rsiOversold),
    stochasticKPeriod: Number(config.stochasticKPeriod),
    stochasticDPeriod: Number(config.stochasticDPeriod),
    stochasticOverbought: Number(config.stochasticOverbought),
    stochasticOversold: Number(config.stochasticOversold),
    macdShortPeriod: Number(config.macdShortPeriod),
    macdLongPeriod: Number(config.macdLongPeriod),
    macdSignalPeriod: Number(config.macdSignalPeriod),
    minConfidence: Number(config.minConfidence),
    timeframe: config.timeframe,
  };
}

function formToConfig(form: FormValues): IndicatorConfig {
  return {
    rsiPeriod: BigInt(form.rsiPeriod),
    rsiOverbought: BigInt(form.rsiOverbought),
    rsiOversold: BigInt(form.rsiOversold),
    stochasticKPeriod: BigInt(form.stochasticKPeriod),
    stochasticDPeriod: BigInt(form.stochasticDPeriod),
    stochasticOverbought: BigInt(form.stochasticOverbought),
    stochasticOversold: BigInt(form.stochasticOversold),
    macdShortPeriod: BigInt(form.macdShortPeriod),
    macdLongPeriod: BigInt(form.macdLongPeriod),
    macdSignalPeriod: BigInt(form.macdSignalPeriod),
    minConfidence: BigInt(form.minConfidence),
    timeframe: form.timeframe,
  };
}

interface FieldGroupProps {
  title: string;
  children: React.ReactNode;
}

function FieldGroup({ title, children }: FieldGroupProps) {
  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-4">
      <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
        {title}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">{children}</div>
    </div>
  );
}

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  "data-ocid"?: string;
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  "data-ocid": ocid,
}: NumberFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-mono text-muted-foreground">{label}</Label>
      <Input
        data-ocid={ocid}
        type="number"
        value={value}
        onChange={(e) => onChange(Number.parseInt(e.target.value) || 0)}
        min={min}
        max={max}
        className="h-9 font-mono text-sm bg-muted/60 border-border text-foreground"
      />
    </div>
  );
}

export function Settings() {
  const { data: savedConfig } = useGetIndicatorConfig();
  const saveConfig = useSaveIndicatorConfig();
  const [form, setForm] = useState<FormValues>(DEFAULT_FORM);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (savedConfig) {
      setForm(configToForm(savedConfig));
      setIsDirty(false);
    }
  }, [savedConfig]);

  const update = (key: keyof FormValues, value: number | string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const handleSave = () => {
    saveConfig.mutate(formToConfig(form), {
      onSuccess: () => {
        toast.success("Configuration saved successfully");
        setIsDirty(false);
      },
      onError: () => {
        toast.error("Failed to save configuration");
      },
    });
  };

  const handleReset = () => {
    setForm(DEFAULT_FORM);
    setIsDirty(true);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto scrollbar-thin">
      <div className="px-6 py-4 border-b border-border bg-card/30 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <SettingsIcon className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold text-foreground">
              Indicator Settings
            </h1>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-8 px-3 text-xs font-mono text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Reset
            </Button>
            <Button
              data-ocid="settings.save.button"
              size="sm"
              onClick={handleSave}
              disabled={!isDirty || saveConfig.isPending}
              className="h-8 px-3 text-xs font-mono bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30"
            >
              {saveConfig.isPending ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5 mr-1.5" />
              )}
              Save Config
            </Button>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-5 pb-24 lg:pb-6 max-w-3xl">
        {/* RSI */}
        <FieldGroup title="RSI — Relative Strength Index">
          <NumberField
            label="Period"
            value={form.rsiPeriod}
            onChange={(v) => update("rsiPeriod", v)}
            min={2}
            max={50}
            data-ocid="settings.rsi.input"
          />
          <NumberField
            label="Overbought Level"
            value={form.rsiOverbought}
            onChange={(v) => update("rsiOverbought", v)}
            min={51}
            max={99}
          />
          <NumberField
            label="Oversold Level"
            value={form.rsiOversold}
            onChange={(v) => update("rsiOversold", v)}
            min={1}
            max={49}
          />
        </FieldGroup>

        <Separator className="bg-border/50" />

        {/* Stochastic */}
        <FieldGroup title="Stochastic Oscillator">
          <NumberField
            label="%K Period"
            value={form.stochasticKPeriod}
            onChange={(v) => update("stochasticKPeriod", v)}
            min={2}
            max={50}
            data-ocid="settings.stoch.input"
          />
          <NumberField
            label="%D Period (Smoothing)"
            value={form.stochasticDPeriod}
            onChange={(v) => update("stochasticDPeriod", v)}
            min={1}
            max={20}
          />
          <NumberField
            label="Overbought Level"
            value={form.stochasticOverbought}
            onChange={(v) => update("stochasticOverbought", v)}
            min={51}
            max={99}
          />
          <NumberField
            label="Oversold Level"
            value={form.stochasticOversold}
            onChange={(v) => update("stochasticOversold", v)}
            min={1}
            max={49}
          />
        </FieldGroup>

        <Separator className="bg-border/50" />

        {/* MACD */}
        <FieldGroup title="MACD — Moving Average Convergence/Divergence">
          <NumberField
            label="Fast EMA Period"
            value={form.macdShortPeriod}
            onChange={(v) => update("macdShortPeriod", v)}
            min={2}
            max={50}
            data-ocid="settings.macd.input"
          />
          <NumberField
            label="Slow EMA Period"
            value={form.macdLongPeriod}
            onChange={(v) => update("macdLongPeriod", v)}
            min={5}
            max={100}
          />
          <NumberField
            label="Signal Period"
            value={form.macdSignalPeriod}
            onChange={(v) => update("macdSignalPeriod", v)}
            min={2}
            max={30}
          />
        </FieldGroup>

        <Separator className="bg-border/50" />

        {/* Signal quality */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            Signal Quality
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-muted-foreground">
                Min Confidence Threshold (%)
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  value={form.minConfidence}
                  onChange={(e) =>
                    update(
                      "minConfidence",
                      Number.parseInt(e.target.value) || 0,
                    )
                  }
                  min={50}
                  max={100}
                  className="h-9 font-mono text-sm bg-muted/60 border-border text-foreground w-24"
                />
                <div className="text-sm font-mono text-muted-foreground">
                  Only signals above{" "}
                  <span className="text-primary font-bold">
                    {form.minConfidence}%
                  </span>{" "}
                  confidence will be shown
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-muted-foreground">
                Primary Timeframe
              </Label>
              <ToggleGroup
                type="single"
                value={form.timeframe}
                onValueChange={(v) => v && update("timeframe", v)}
                className="bg-muted/60 rounded-lg p-0.5 w-fit"
              >
                {["1M", "5M"].map((tf) => (
                  <ToggleGroupItem
                    key={tf}
                    value={tf}
                    className="h-8 px-4 text-xs font-mono data-[state=on]:bg-primary/20 data-[state=on]:text-primary rounded-md"
                  >
                    {tf}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          </div>
        </div>

        {/* Info box */}
        <div className="bg-primary/5 rounded-xl border border-primary/20 p-4">
          <div className="text-xs font-mono text-primary/80 leading-relaxed">
            <strong className="text-primary">Signal Generation Rules:</strong>
            <br />
            <span className="text-muted-foreground">
              BUY: RSI &lt; {form.rsiOversold} turning up + Stoch K crosses
              above D below {form.stochasticOversold} + MACD cross above signal
              <br />
              SELL: RSI &gt; {form.rsiOverbought} turning down + Stoch K crosses
              below D above {form.stochasticOverbought} + MACD cross below
              signal
              <br />
              Min confidence: {form.minConfidence}% • Timeframe:{" "}
              {form.timeframe}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
