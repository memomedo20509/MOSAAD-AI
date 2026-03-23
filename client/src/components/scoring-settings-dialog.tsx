import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import { Flame, Thermometer, Snowflake, Settings } from "lucide-react";

interface ScoringConfig {
  hotMaxDays: number;
  coldMinDays: number;
  weightRecency: number;
  weightEngagement: number;
  weightTaskCompletion: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ScoringSettingsDialog({ open, onClose }: Props) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [hotDays, setHotDays] = useState(3);
  const [coldDays, setColdDays] = useState(14);
  const [weightRecency, setWeightRecency] = useState(40);
  const [weightEngagement, setWeightEngagement] = useState(30);
  const [weightTaskCompletion, setWeightTaskCompletion] = useState(30);

  const { data: config } = useQuery<ScoringConfig>({
    queryKey: ["/api/scoring-config"],
    enabled: open,
  });

  useEffect(() => {
    if (config) {
      setHotDays(config.hotMaxDays);
      setColdDays(config.coldMinDays);
      setWeightRecency(config.weightRecency ?? 40);
      setWeightEngagement(config.weightEngagement ?? 30);
      setWeightTaskCompletion(config.weightTaskCompletion ?? 30);
    }
  }, [config]);

  const totalWeight = weightRecency + weightEngagement + weightTaskCompletion;

  const saveMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/scoring-config", {
        hotMaxDays: hotDays,
        coldMinDays: coldDays,
        weightRecency,
        weightEngagement,
        weightTaskCompletion,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scoring-config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: t.success });
      onClose();
    },
    onError: () => {
      toast({ title: t.error, variant: "destructive" });
    },
  });

  const invalid = hotDays >= coldDays || totalWeight !== 100;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t.leadScore} — {t.settings}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-1.5">
                  <Flame className="h-3.5 w-3.5 text-red-600" />
                  <span className="font-medium text-sm">{t.scoreHot}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground whitespace-nowrap">{t.daysSinceContact} ≤</Label>
                  <Input
                    type="number" min={1} max={30} value={hotDays}
                    onChange={(e) => setHotDays(Number(e.target.value))}
                    className="h-7 w-16 text-sm" data-testid="input-hot-days"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-1.5">
                  <Snowflake className="h-3.5 w-3.5 text-blue-600" />
                  <span className="font-medium text-sm">{t.scoreCold}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground whitespace-nowrap">{t.daysSinceContact} ≥</Label>
                  <Input
                    type="number" min={hotDays + 1} max={90} value={coldDays}
                    onChange={(e) => setColdDays(Number(e.target.value))}
                    className="h-7 w-16 text-sm" data-testid="input-cold-days"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Thermometer className="h-3.5 w-3.5 text-orange-600" />
                <span className="font-medium text-sm">{t.scoreWarm}</span>
                <span className="text-xs text-muted-foreground">({hotDays + 1}–{coldDays - 1} {t.daysSinceContact})</span>
              </div>
            </CardContent>
          </Card>

          <div className="border rounded-lg p-3 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">{t.scoringWeights || "Scoring Weights"}</span>
              <span className={`text-xs font-medium ${totalWeight === 100 ? "text-green-600" : "text-red-600"}`}>
                {t.total || "Total"}: {totalWeight}% {totalWeight !== 100 && "(must = 100%)"}
              </span>
            </div>
            {[
              { label: t.daysSinceContact, value: weightRecency, setter: setWeightRecency, testId: "input-weight-recency" },
              { label: t.communications || "Communications", value: weightEngagement, setter: setWeightEngagement, testId: "input-weight-engagement" },
              { label: t.tasks || "Tasks", value: weightTaskCompletion, setter: setWeightTaskCompletion, testId: "input-weight-tasks" },
            ].map(({ label, value, setter, testId }) => (
              <div key={testId} className="flex items-center gap-3">
                <Label className="text-xs text-muted-foreground flex-1">{label}</Label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number" min={0} max={100} value={value}
                    onChange={(e) => setter(Number(e.target.value))}
                    className="h-7 w-16 text-sm" data-testid={testId}
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>{t.cancel}</Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || invalid}
              data-testid="button-save-scoring-config"
            >
              {saveMutation.isPending ? t.saving : t.save}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
