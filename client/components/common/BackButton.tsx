import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function BackButton({ to }: { to?: string }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => (to ? navigate(to) : navigate(-1))}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border hover:shadow-sm bg-white"
    >
      <ArrowLeft className="w-4 h-4" /> Voltar
    </button>
  );
}
