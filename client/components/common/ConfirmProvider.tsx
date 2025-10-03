import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ConfirmOptions = {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
};

type AlertOptions = {
  title?: string;
  description?: string;
  okText?: string;
};

type ConfirmContextValue = {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  alert: (opts: AlertOptions) => Promise<void>;
};

const ConfirmContext = createContext<ConfirmContextValue | undefined>(undefined);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx.confirm;
}

export function useAlert() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useAlert must be used within ConfirmProvider");
  return ctx.alert;
}

export const ConfirmProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"confirm" | "alert">("confirm");
  const [opts, setOpts] = useState<ConfirmOptions & AlertOptions>({});
  const [resolver, setResolver] = useState<((v?: any) => void) | null>(null);

  const confirm = useCallback((o: ConfirmOptions) => {
    setMode("confirm");
    setOpts(o);
    setOpen(true);
    return new Promise<boolean>((resolve) => setResolver(() => resolve));
  }, []);

  const alert = useCallback((o: AlertOptions) => {
    setMode("alert");
    setOpts(o);
    setOpen(true);
    return new Promise<void>((resolve) => setResolver(() => resolve));
  }, []);

  const handleCancel = () => {
    setOpen(false);
    if (resolver && mode === "confirm") resolver(false);
    setResolver(null);
  };
  const handleConfirm = () => {
    setOpen(false);
    if (resolver) resolver(mode === "confirm" ? true : undefined);
    setResolver(null);
  };

  const value = useMemo(() => ({ confirm, alert }), [confirm, alert]);

  const title = opts.title || (mode === "confirm" ? "Confirmar ação" : "Aviso");
  const description = opts.description || (mode === "confirm" ? "Deseja continuar?" : "");

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <AlertDialog open={open} onOpenChange={(v) => { if (!v) handleCancel(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            {description ? (
              <AlertDialogDescription>{description}</AlertDialogDescription>
            ) : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            {mode === "confirm" ? (
              <>
                <AlertDialogCancel onClick={handleCancel}>{opts.cancelText || "Cancelar"}</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirm}>{opts.confirmText || "Confirmar"}</AlertDialogAction>
              </>
            ) : (
              <AlertDialogAction onClick={handleConfirm}>{(opts as AlertOptions).okText || "OK"}</AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
};


