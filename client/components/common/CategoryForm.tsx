import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCategory, updateCategory } from "@/services/categoria";

export default function CategoryForm({
  item,
  onSaved,
}: {
  item?: { id: string; name: string; active?: boolean } | null;
  onSaved?: (c: any) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(item?.name ?? "");
  const [active, setActive] = useState<boolean>(item?.active ?? true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setName(item?.name ?? "");
    setActive(item?.active ?? true);
  }, [item]);

  const submit = async () => {
    setLoading(true);
    try {
      let res;
      if (item?.id) {
        res = await updateCategory(item.id, { name, active });
      } else {
        res = await createCategory({ name, active });
      }
      onSaved && onSaved(res);
      setOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">{item ? "Editar" : "Nova categoria"}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? "Editar categoria" : "Nova categoria"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Label>Nome</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />

          <div className="flex items-center gap-2">
            <input id="cat-active" type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            <Label>Ativa</Label>
          </div>

          <div className="flex justify-end">
            <Button onClick={submit} disabled={loading}>{loading ? "Salvando..." : "Salvar"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
