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
import QrCodePage from "./pages/QrCode";
import ResetPasswordPage from "./pages/ResetPassword";
import FirstAccessChangePassword from "./pages/FirstAccessChangePassword";
import NotFound from "./pages/NotFound";
import Layout from "@/components/common/Layout";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import RoleRoute from "@/components/common/RoleRoute";
import AdminHome from "@/pages/admin/Index";
import AdminUsuariosPage from "@/pages/admin/Usuarios";
import AdminTenantsPage from "@/pages/admin/Tenants";
import AdminLeadsPage from "@/pages/admin/Leads";
import ConfiguracoesPage from "@/pages/configuracoes/Index";
import { ConfirmProvider } from "@/components/common/ConfirmProvider";
import { TourProvider } from "@/components/common/TourProvider";
import CaptacaoPage from "@/pages/Captacao";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ConfirmProvider>
      <TourProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/primeiro-acesso/alterar-senha" element={<FirstAccessChangePassword />} />
          <Route path="/captacao" element={<CaptacaoPage />} />

          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<RoleRoute roles={["MASTER","ADMIN","CASHIER"]}><Dashboard /></RoleRoute>} />
            <Route path="/caixa" element={<RoleRoute roles={["MASTER","ADMIN","CASHIER"]}><CaixaPage /></RoleRoute>} />
            <Route path="/categorias" element={<RoleRoute roles={["MASTER","ADMIN","CASHIER"]}><CategoriasPage /></RoleRoute>} />
            <Route path="/produtos" element={<RoleRoute roles={["MASTER","ADMIN","CASHIER"]}><ProdutosPage /></RoleRoute>} />
            <Route path="/comandas/abrir" element={<RoleRoute roles={["MASTER","ADMIN","CASHIER","WAITER"]}><AbrirComanda /></RoleRoute>} />
            <Route path="/relatorios" element={<RoleRoute roles={["MASTER","ADMIN"]}><RelatoriosPage /></RoleRoute>} />
            <Route path="/admin" element={<RoleRoute roles={["MASTER"]}><AdminHome /></RoleRoute>} />
            <Route path="/admin/usuarios" element={<RoleRoute roles={["MASTER"]}><AdminUsuariosPage /></RoleRoute>} />
            <Route path="/admin/leads" element={<RoleRoute roles={["MASTER"]}><AdminLeadsPage /></RoleRoute>} />
            <Route path="/admin/tenants" element={<RoleRoute roles={["MASTER"]}><AdminTenantsPage /></RoleRoute>} />
            <Route path="/configuracoes" element={<RoleRoute roles={["MASTER","ADMIN"]}><ConfiguracoesPage /></RoleRoute>} />
            <Route path="/qr" element={<QrCodePage />} />
          </Route>

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      </TourProvider>
      </ConfirmProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
