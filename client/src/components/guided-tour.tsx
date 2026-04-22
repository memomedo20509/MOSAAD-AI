import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/lib/i18n";

export type TourStep = {
  target: string;
  title: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right";
};

export function useTourSteps(): TourStep[] {
  const { t } = useLanguage();
  return [
    {
      target: "[data-testid='text-app-name']",
      title: t.tourSidebarTitle,
      description: t.tourSidebarDesc,
      position: "right",
    },
    {
      target: "[data-testid='text-kpi-value']",
      title: t.tourKpisTitle,
      description: t.tourKpisDesc,
      position: "bottom",
    },
    {
      target: "[data-testid='link-nav-add-lead']",
      title: t.tourAddLeadTitle,
      description: t.tourAddLeadDesc,
      position: "right",
    },
    {
      target: "[data-testid='link-nav-conversations']",
      title: t.tourConversationsTitle,
      description: t.tourConversationsDesc,
      position: "right",
    },
    {
      target: "[data-testid='link-nav-knowledge-base']",
      title: t.tourKbTitle,
      description: t.tourKbDesc,
      position: "right",
    },
    {
      target: "[data-testid='link-nav-chatbot-config']",
      title: t.tourChatbotTitle,
      description: t.tourChatbotDesc,
      position: "right",
    },
    {
      target: "[data-testid='link-nav-analytics']",
      title: t.tourAnalyticsTitle,
      description: t.tourAnalyticsDesc,
      position: "right",
    },
    {
      target: "[data-testid='button-logout']",
      title: t.tourDoneTitle,
      description: t.tourDoneDesc,
      position: "left",
    },
  ];
}

type Rect = { top: number; left: number; width: number; height: number };

function getElementRect(selector: string): Rect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function TourTooltip({
  step,
  stepIndex,
  totalSteps,
  rect,
  onNext,
  onPrev,
  onClose,
}: {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  rect: Rect;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}) {
  const { t, isRTL } = useLanguage();
  const TOOLTIP_WIDTH = 300;
  const TOOLTIP_GAP = 14;
  const TOOLTIP_HEIGHT_ESTIMATE = 160;

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let top = 0;
  let left = 0;
  const pos = step.position ?? "bottom";

  if (pos === "bottom") {
    top = rect.top + rect.height + TOOLTIP_GAP;
    left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
  } else if (pos === "top") {
    top = rect.top - TOOLTIP_HEIGHT_ESTIMATE - TOOLTIP_GAP;
    left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
  } else if (pos === "right") {
    top = rect.top + rect.height / 2 - TOOLTIP_HEIGHT_ESTIMATE / 2;
    left = rect.left + rect.width + TOOLTIP_GAP;
  } else {
    top = rect.top + rect.height / 2 - TOOLTIP_HEIGHT_ESTIMATE / 2;
    left = rect.left - TOOLTIP_WIDTH - TOOLTIP_GAP;
  }

  left = Math.max(12, Math.min(left, vw - TOOLTIP_WIDTH - 12));
  top = Math.max(12, Math.min(top, vh - TOOLTIP_HEIGHT_ESTIMATE - 12));

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === totalSteps - 1;

  return (
    <>
      <div
        className="fixed inset-0 z-[9990]"
        style={{ background: "rgba(0,0,0,0.45)" }}
        onClick={onClose}
      />
      <div
        className="fixed z-[9999] rounded-xl border bg-card shadow-2xl p-4 flex flex-col gap-3"
        style={{ width: TOOLTIP_WIDTH, top, left }}
        dir={isRTL ? "rtl" : "ltr"}
        data-testid="guided-tour-tooltip"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <span className="text-xs text-muted-foreground block mb-1">
              {stepIndex + 1} {t.tourStepOf} {totalSteps}
            </span>
            <h3 className="font-semibold text-sm leading-tight">{step.title}</h3>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onClose} data-testid="button-close-tour">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onPrev}
            disabled={isFirst}
            className="gap-1 text-xs"
            data-testid="button-tour-prev"
          >
            {isRTL ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
            {t.tourPrev}
          </Button>
          <div className="flex gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === stepIndex ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
          <Button
            size="sm"
            onClick={onNext}
            className="gap-1 text-xs"
            data-testid={isLast ? "button-tour-finish" : "button-tour-next"}
          >
            {isLast ? t.tourFinish : t.tourNext}
            {!isLast && (isRTL ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />)}
          </Button>
        </div>
      </div>
      <div
        className="fixed z-[9995] rounded-md ring-4 ring-primary ring-offset-2 pointer-events-none transition-all duration-300"
        style={{
          top: rect.top - 4,
          left: rect.left - 4,
          width: rect.width + 8,
          height: rect.height + 8,
        }}
      />
    </>
  );
}

type GuidedTourProps = {
  open: boolean;
  onClose: () => void;
  steps?: TourStep[];
};

export function GuidedTour({ open, onClose, steps }: GuidedTourProps) {
  const defaultSteps = useTourSteps();
  const tourSteps = steps ?? defaultSteps;
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const qc = useQueryClient();

  const markSeenMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", "/api/onboarding/step", { markTourSeen: true });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/onboarding/status"] });
      qc.invalidateQueries({ queryKey: ["/api/user"] });
    },
  });

  const updateRect = useCallback(() => {
    if (!open || stepIndex >= tourSteps.length) return;
    const r = getElementRect(tourSteps[stepIndex].target);
    if (r) setRect(r);
    else setRect({ top: window.innerHeight / 2 - 80, left: window.innerWidth / 2 - 150, width: 0, height: 0 });
  }, [open, stepIndex, tourSteps]);

  useEffect(() => {
    if (!open) return;
    setStepIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timeout = setTimeout(updateRect, 150);
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [open, updateRect]);

  const handleClose = () => {
    markSeenMutation.mutate();
    onClose();
  };

  const handleNext = () => {
    if (stepIndex < tourSteps.length - 1) {
      setStepIndex(i => i + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (stepIndex > 0) setStepIndex(i => i - 1);
  };

  if (!open || !rect) return null;

  return createPortal(
    <TourTooltip
      step={tourSteps[stepIndex]}
      stepIndex={stepIndex}
      totalSteps={tourSteps.length}
      rect={rect}
      onNext={handleNext}
      onPrev={handlePrev}
      onClose={handleClose}
    />,
    document.body
  );
}
