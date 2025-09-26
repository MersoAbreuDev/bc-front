import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

const formatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function CurrencyInput({
  value,
  onChange,
  placeholder,
  id,
  className,
}: {
  value: number;
  onChange: (n: number) => void;
  placeholder?: string;
  id?: string;
  className?: string;
}) {
  const [display, setDisplay] = useState<string>(() => (isNaN(value) ? "" : formatter.format(value)));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    // keep display in sync with external value when not editing
    if (!focused) setDisplay(isNaN(value) ? "" : formatter.format(value));
  }, [value, focused]);

  const parse = (v: string) => {
    if (!v) return 0;
    // Normalize common currency input patterns:
    // - Remove currency symbols and non-numeric except separators
    // - Replace comma with dot for parseFloat
    let s = v.replace(/\s|\u00A0|R\$|\$/g, "");
    // allow both comma and dot, but remove thousands separators (dots) and normalize comma to dot
    // first remove dots that are used as thousands separators: if there is a comma present, dots are thousands separators
    if (s.indexOf(",") !== -1) {
      s = s.replace(/\./g, "");
      s = s.replace(/,/g, ".");
    } else {
      // no comma: remove any non-digit or dot except the decimal dot
      // keep dots as decimal separator
      // remove any other characters
      s = s.replace(/[^0-9.\-]/g, "");
    }
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setDisplay(v);
    const n = parse(v);
    onChange(n);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setFocused(true);
    // show a simpler editable representation when focusing (no currency symbol)
    if (typeof value === "number" && !isNaN(value)) {
      // show with comma as decimal separator and without grouping
      const raw = value.toFixed(2).replace(".", ",");
      // if value is 0, clear the field to make typing easier
      setDisplay(value === 0 ? "" : raw);
    }
  };

  const handleBlur = () => {
    setFocused(false);
    const n = parse(display);
    setDisplay(isNaN(n) ? "" : formatter.format(n));
    // ensure parent has the parsed value
    onChange(n);
  };

  return (
    <Input
      id={id}
      value={display}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={className}
    />
  );
}
