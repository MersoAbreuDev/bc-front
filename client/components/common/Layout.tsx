import React, { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import AppBrand from "@/components/common/AppBrand";
import { getCurrentUser, logout } from "@/services/auth/api";
import { LogOut, Home, CreditCard, Layers, Box, FileText, PlusSquare, ClipboardList, Menu } from "lucide-react";

export default function Layout({ children }: { children?: React.ReactNode }) {
  const user = getCurrentUser();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState<boolean>(() => localStorage.getItem("bcomandas:sidebarCollapsed") === "1");

  useEffect(() => {
    localStorage.setItem("bcomandas:sidebarCollapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const navItems = [
    { to: "/dashboard", label: "Dashboard", icon: <Home className="w-5 h-5" /> },
    { to: "/caixa", label: "Caixa", icon: <CreditCard className="w-5 h-5" /> },
    { to: "/categorias", label: "Categorias", icon: <Layers className="w-5 h-5" /> },
    { to: "/produtos", label: "Produtos", icon: <Box className="w-5 h-5" /> },
    { to: "/comandas/abrir", label: "Abrir comanda", icon: <PlusSquare className="w-5 h-5" /> },
    { to: "/relatorios", label: "Relatórios", icon: <FileText className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside className={`bg-[#fff7ef] border-r p-2 transition-all duration-200 overflow-hidden ${collapsed ? 'w-20' : 'w-64'}`} aria-expanded={!collapsed}>
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <AppBrand compact={collapsed} onToggle={() => setCollapsed((c) => !c)} />
          </div>
        </div>

        <nav className="mt-6 flex flex-col gap-2">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `flex items-center gap-3 p-3 rounded-md hover:bg-[#ffecd6] ${isActive ? 'bg-[#ffecd6]' : ''}`}>
              <div className={`flex items-center justify-center ${collapsed ? 'w-full' : 'w-8'}`}>{item.icon}</div>
              <div className={`${collapsed ? 'hidden' : 'block'} text-sm`}>{item.label}</div>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto px-2 py-4" />
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="flex items-center justify-between px-4 py-3 border-b">
          <div className="md:hidden">
            <button onClick={() => setCollapsed((c) => !c)} className="p-2 rounded-md hover:bg-slate-100"><Menu className="w-5 h-5" /></button>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-muted-foreground mr-4 hidden md:block">{user ? `Olá, ${user.name}` : ''}</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleLogout} className="flex items-center gap-2 p-2 rounded-md hover:bg-slate-100" aria-label="Sair">
              <LogOut className="w-5 h-5" />
              <span className="hidden md:inline text-sm">Sair</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          {children}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
