import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import CaixaPage from "./pages/caixa/Index";
import CategoriasPage from "./pages/categorias/Index";
import ProdutosPage from "./pages/produtos/Index";
import AbrirComanda from "./pages/comandas/Abrir";
import RelatoriosPage from "./pages/relatorios/Index";
import NotFound from "./pages/NotFound";
import Layout from "@/components/common/Layout";
import ProtectedRoute from "@/components/common/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />

          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/caixa" element={<CaixaPage />} />
            <Route path="/categorias" element={<CategoriasPage />} />
            <Route path="/produtos" element={<ProdutosPage />} />
            <Route path="/comandas/abrir" element={<AbrirComanda />} />
            <Route path="/relatorios" element={<RelatoriosPage />} />
          </Route>

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
