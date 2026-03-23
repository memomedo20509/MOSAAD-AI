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

  const { data: config } = useQuery<ScoringConfig>({
    queryKey: ["/api/scoring-config"],
    enabled: open,
  });

  useEffect(() => {
    if (config) {
      setHotDays(config.hotMaxDays);
      setColdDays(config.coldMinDays);
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/scoring-config", { hotMaxDays: hotDays, coldMinDays: coldDays }),
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

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t.leadScore} - {t.settings || "Settings"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-red-600" />
                <span className="font-medium text-sm">{t.scoreHot}</span>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground w-48">{t.daysSinceContact} &le;</Label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={hotDays}
                  onChange={(e) => setHotDays(Number(e.target.value))}
                  className="h-8 w-20"
                  data-testid="input-hot-days"
                />
                <span className="text-xs text-muted-foreground">{t.daysSinceContact}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-orange-600" />
                <span className="font-medium text-sm">{t.scoreWarm}</span>
                <span className="text-xs text-muted-foreground">({hotDays + 1} - {coldDays - 1} {t.daysSinceContact})</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Snowflake className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-sm">{t.scoreCold}</span>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground w-48">{t.daysSinceContact} &ge;</Label>
                <Input
                  type="number"
                  min={hotDays + 1}
                  max={90}
                  value={coldDays}
                  onChange={(e) => setColdDays(Number(e.target.value))}
                  className="h-8 w-20"
                  data-testid="input-cold-days"
                />
                <span className="text-xs text-muted-foreground">{t.daysSinceContact}</span>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>{t.cancel}</Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || hotDays >= coldDays}
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
