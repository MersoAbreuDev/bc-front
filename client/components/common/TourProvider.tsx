import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type TourStep = {
  target: string; // CSS selector
  title: string;
  description?: string;
};

type TourContextValue = {
  start: (steps?: TourStep[]) => void;
  stop: () => void;
  active: boolean;
};

const TourContext = createContext<TourContextValue | undefined>(undefined);

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within TourProvider");
  return ctx;
}

export const TourProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [index, setIndex] = useState<number>(0);
  const [active, setActive] = useState<boolean>(false);

  const step = steps[index];
  const targetEl = step ? (document.querySelector(step.target) as HTMLElement | null) : null;

  const start = useCallback((s?: TourStep[]) => {
    const st = s && s.length ? s : defaultSteps();
    setSteps(st);
    setIndex(0);
    setActive(true);
  }, []);

  const stop = useCallback(() => {
    setActive(false);
    setSteps([]);
    setIndex(0);
  }, []);

  useEffect(() => {
    // iniciar automaticamente SEM validar primeiro acesso (modo teste)
    setTimeout(() => {
      try { start(); } catch { /* ignore */ }
    }, 500);
  }, [start]);

  const next = () => setIndex((i) => Math.min(steps.length - 1, i + 1));
  const prev = () => setIndex((i) => Math.max(0, i - 1));

  const value = useMemo(() => ({ start, stop, active }), [start, stop, active]);

  return (
    <TourContext.Provider value={value}>
      {children}
      {active && step && targetEl && (
        <Overlay target={targetEl} title={step.title} description={step.description} onNext={next} onPrev={prev} onClose={stop} hasPrev={index>0} hasNext={index<steps.length-1} />
      )}
    </TourContext.Provider>
  );
};

function defaultSteps(): TourStep[] {
  return [
    { target: '[data-tour="nav-dashboard"]', title: 'Dashboard', description: 'Visão geral do seu negócio.' },
    { target: '[data-tour="nav-caixa"]', title: 'Caixa', description: 'Abra o caixa antes de vender e registre movimentações.' },
    { target: '[data-tour="nav-categorias"]', title: 'Categorias', description: 'Cadastre categorias antes dos produtos.' },
    { target: '[data-tour="nav-produtos"]', title: 'Produtos', description: 'Cadastre seus produtos para vender.' },
    { target: '[data-tour="nav-comandas"]', title: 'Abrir comanda', description: 'Realize as vendas abrindo comandas.' },
  ];
}

function Overlay({ target, title, description, onNext, onPrev, onClose, hasPrev, hasNext }: {
  target: HTMLElement;
  title: string;
  description?: string;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}) {
  // calcular posição
  const rect = target.getBoundingClientRect();
  const highlightStyle: React.CSSProperties = {
    position: 'fixed',
    left: rect.left - 8,
    top: rect.top - 8,
    width: rect.width + 16,
    height: rect.height + 16,
    border: '2px solid #f59e0b',
    borderRadius: 8,
    pointerEvents: 'none',
    zIndex: 99999,
  };
  const tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    left: Math.max(16, Math.min(rect.left, window.innerWidth - 320 - 16)),
    top: rect.bottom + 12,
    width: 320,
    zIndex: 100000,
  };
  return (
    <div>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99998 }} onClick={onClose} />
      <div style={highlightStyle} />
      <div style={tooltipStyle}>
        <div className="rounded-md bg-white shadow-lg border p-4">
          <div className="text-base font-semibold">{title}</div>
          {description ? <div className="text-sm text-slate-600 mt-1">{description}</div> : null}
          <div className="flex justify-end gap-2 mt-3">
            {hasPrev && (<button className="px-3 py-1 border rounded" onClick={onPrev}>Voltar</button>)}
            {hasNext ? (
              <button className="px-3 py-1 border rounded bg-black text-white" onClick={onNext}>Avançar</button>
            ) : (
              <button className="px-3 py-1 border rounded bg-black text-white" onClick={onClose}>Concluir</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


