import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Clock, 
  RadioTower, 
  ListTodo, 
  MoreHorizontal,
  User,
  CalendarDays,
  Receipt
} from 'lucide-react';
import { cn } from '@/hrms/lib/utils';
import { useAuth } from '@/hrms/contexts/AuthContext';
import { useHaptics } from '@/hrms/hooks/useHaptics';

export const BottomNav: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const location = useLocation();
  const { lightImpact } = useHaptics();

  const isSuperAdmin = user?.role === 'super_admin' || (typeof user?.role === 'object' && (user.role as any).role === 'super_admin');
  const isAdminOrManager = isSuperAdmin || hasPermission('view_admin_dashboard') || hasPermission('manage_users');


  const navItems = [
    {
      label: 'Home',
      icon: LayoutDashboard,
      to: '/',
      exact: true,
      permission: 'view_dashboard',
    },
    {
      label: 'Attendance',
      icon: Clock,
      to: isSuperAdmin ? '/employees' : '/staff/attendance',
    },
    {
      label: 'Leaves',
      icon: CalendarDays,
      to: '/staff/leaves',
      onlyEmployee: true,
    },
    {
      label: 'Expenses',
      icon: Receipt,
      to: '/staff/expenses',
      onlyEmployee: true,
    },
    {
      label: 'Tracking',
      icon: RadioTower,
      to: '/staff/live-tracking',
      permission: 'view_live_tracking',
    },
    {
      label: 'Tasks',
      icon: ListTodo,
      to: '/operations/tasks',
      permission: 'view_operations',
    },
    {
      label: 'Profile',
      icon: User,
      to: '/profile',
    },
  ];

  const filteredItems = navItems.filter(item => {
    if (isAdminOrManager && item.onlyEmployee) return false;
    return !item.permission || hasPermission(item.permission);
  }).slice(0, 5);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-inherit backdrop-blur-xl border-t border-slate-200 px-2 pb-safe-offset-2 pt-2 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-around">
        {filteredItems.map((item) => {
          const isActive = item.exact 
            ? location.pathname === item.to 
            : location.pathname.startsWith(item.to);
          
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => lightImpact()}
              className={({ isActive: linkActive }) => cn(
                "flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all duration-300",
                isActive ? "text-indigo-600 bg-indigo-50" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              )}
            >
              <item.icon className={cn(
                "h-5 w-5 transition-transform duration-300",
                isActive ? "scale-110" : "scale-100"
              )} />
              <span className={cn(
                "text-[10px] font-bold tracking-tight transition-all",
                isActive ? "opacity-100" : "opacity-70"
              )}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
