import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { 
  LayoutDashboard, 
  FileText, 
  Settings, 
  LogOut, 
  Activity,
  Menu,
  X
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SidebarItem: React.FC<{ 
  to: string; 
  icon: React.ReactNode; 
  label: string; 
  active?: boolean;
}> = ({ to, icon, label, active }) => (
  <Link
    to={to}
    className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
      active 
        ? "bg-emerald-50 text-emerald-700 font-medium shadow-sm" 
        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
    )}
  >
    <div className={cn(
      "shrink-0 transition-transform duration-200",
      !active && "group-hover:scale-110"
    )}>
      {icon}
    </div>
    <span className="truncate">{label}</span>
  </Link>
);

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { to: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { to: '/reports', icon: <FileText size={20} />, label: 'Patient Reports' },
    { to: '/rules', icon: <Settings size={20} />, label: 'Knowledge Base' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 p-4">
        <div className="flex items-center gap-2 px-2 mb-8">
          <Activity className="text-emerald-600 shrink-0" size={28} />
          <span className="text-xl font-bold text-slate-900 truncate">HealthLink</span>
        </div>

        <nav className="flex-1 space-y-1">
          {menuItems.map((item) => (
            <SidebarItem
              key={item.to}
              {...item}
              active={location.pathname === item.to}
            />
          ))}
        </nav>

        <div className="pt-4 border-t border-slate-100">
          <div className="px-4 py-3 mb-4">
            <p className="text-sm font-medium text-slate-900">{user?.name}</p>
            <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-bottom border-slate-200 h-16 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-2">
          <Activity className="text-emerald-600" size={24} />
          <span className="text-lg font-bold text-slate-900">HealthLink</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-white z-40 pt-16 p-4 flex flex-col">
          <nav className="flex-1 space-y-1">
            {menuItems.map((item) => (
              <SidebarItem
                key={item.to}
                {...item}
                active={location.pathname === item.to}
              />
            ))}
          </nav>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-4"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="hidden md:flex h-16 bg-white border-b border-slate-200 items-center justify-between px-8">
          <h1 className="text-lg font-semibold text-slate-800">
            {menuItems.find(i => i.to === location.pathname)?.label || 'Portal'}
          </h1>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-900">{user?.name}</p>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
              {user?.name.charAt(0)}
            </div>
          </div>
        </header>
        <div className="flex-1 p-4 md:p-8 pt-20 md:pt-8 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
