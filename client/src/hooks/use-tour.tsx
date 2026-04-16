import { createContext, useContext, useState, ReactNode, useCallback } from "react";

type TourContextType = {
  isTourOpen: boolean;
  openTour: () => void;
  closeTour: () => void;
};

const TourContext = createContext<TourContextType | null>(null);

export function TourProvider({ children }: { children: ReactNode }) {
  const [isTourOpen, setIsTourOpen] = useState(false);

  const openTour = useCallback(() => setIsTourOpen(true), []);
  const closeTour = useCallback(() => setIsTourOpen(false), []);

  return (
    <TourContext.Provider value={{ isTourOpen, openTour, closeTour }}>
      {children}
    </TourContext.Provider>
  );
}

export function useTour(): TourContextType {
  const ctx = useContext(TourContext);
  if (!ctx) {
    return { isTourOpen: false, openTour: () => {}, closeTour: () => {} };
  }
  return ctx;
}
