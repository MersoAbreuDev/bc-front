import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import CurrencyInput from "@/components/common/CurrencyInput";
import { createProduct, updateProduct } from "@/services/produtos";
import { listCategories } from "@/services/categoria";

export default function ProductForm({
  item,
  onSaved,
}: {
  item?: { id?: string; name?: string; brand?: string; price?: number; categoryId?: string; active?: boolean } | null;
  onSaved?: (p: any) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(item?.name ?? "");
  const [brand, setBrand] = useState(item?.brand ?? "");
  const [price, setPrice] = useState<number>(item?.price ?? 0);
  const [categoryId, setCategoryId] = useState<string | undefined>(item?.categoryId);
  const [active, setActive] = useState<boolean>(item?.active ?? true);
  const [categories, setCategories] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setName(item?.name ?? "");
    setBrand(item?.brand ?? "");
    setPrice(item?.price ?? 0);
    setCategoryId(item?.categoryId);
    setActive(item?.active ?? true);
  }, [item]);

  useEffect(() => {
    (async () => {
      try {
        const cats = await listCategories();
        setCategories(cats);
      } catch (e) { console.error(e); }
    })();
  }, []);

  const submit = async () => {
    setLoading(true);
    try {
      let res;
      const payload: any = { name, price, categoryId, active };
      if (brand) payload.brand = brand;
      if (item?.id) {
        res = await updateProduct(item.id!, payload);
      } else {
        res = await createProduct(payload);
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
        <Button variant="outline">{item ? "Editar" : "Novo produto"}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? "Editar produto" : "Novo produto"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Label>Nome</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />

          <Label>Marca (opcional)</Label>
          <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Ex.: Heineken" />

          <Label>Preço</Label>
          <CurrencyInput value={price} onChange={(n) => setPrice(n)} />

          <Label>Categoria</Label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm">
            <option value="">-- Sem categoria --</option>
            {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>

          <div className="flex items-center gap-2">
            <input id="active" type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            <Label>Ativo</Label>
          </div>

          <div className="flex justify-end">
            <Button onClick={submit} loading={loading} loadingText="Salvando...">Salvar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
