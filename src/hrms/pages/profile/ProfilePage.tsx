import React from 'react';
import { useAuth } from '@/hrms/contexts/AuthContext';
import {
  User,
  Mail,
  Shield,
  Phone,
  Calendar,
  Edit3,
  ChevronRight,
  Settings,
  LogOut,
  Clock,
  Building2,
  Award,
  Bell
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/hrms/components/ui/avatar';
import { Button } from '@/hrms/components/ui/button';
import { Badge } from '@/hrms/components/ui/badge';
import { Card, CardContent } from '@/hrms/components/ui/card';
import { ProfileDialog } from '@/hrms/components/layout/ProfileDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/hrms/components/ui/alert-dialog";

const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const [isProfileDialogOpen, setIsProfileDialogOpen] = React.useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = React.useState(false);

  if (!user) return null;

  const roleLabel = (user.role && typeof user.role === 'object')
    ? (user.role as any).label
    : String(user.role || '').replace('_', ' ').toUpperCase();


  return (
    <div className="max-w-7xl mx-auto pb-24 px-4 sm:px-6 lg:px-8 pt-6 sm:pt-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

        {/* ── Left Column: Profile & Stats ── */}
        <div className="space-y-8">
          {/* Header Section */}
          <div className="flex flex-col items-center text-center space-y-4 bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
            <div className="relative group">
              <Avatar className="h-32 w-32 sm:h-40 sm:w-40 rounded-[2.5rem] shadow-2xl border-4 border-white transition-transform duration-500 group-hover:scale-105">
                <AvatarImage src={user.avatar} className="object-cover" />
                <AvatarFallback className="text-3xl font-bold bg-indigo-600 text-white">
                  {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Button
                size="icon"
                className="absolute -bottom-2 -right-2 h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-white shadow-xl border border-slate-100 hover:bg-slate-50 transition-all text-indigo-600"
                onClick={() => setIsProfileDialogOpen(true)}
              >
                <Edit3 className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight">{user.name}</h1>
              <div className="flex items-center justify-center gap-2">
                <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 border-indigo-100 font-bold px-4 py-1 rounded-full text-[10px] uppercase tracking-widest">
                  {roleLabel}
                </Badge>
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Now</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Column: Details & Actions ── */}
        <div className="space-y-8">
          {/* Personal Details */}
          <div className="space-y-4">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-6 flex items-center gap-2">
              <User className="h-3.5 w-3.5" />
              Personal Details
            </h2>
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-3 space-y-1">
              <div className="flex items-center gap-4 p-4 rounded-3xl hover:bg-slate-50 transition-colors group">
                <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Email</p>
                  <p className="text-xs font-bold text-slate-700 truncate">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-3xl hover:bg-slate-50 transition-colors group">
                <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100">
                  <Phone className="h-4 w-4 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Mobile</p>
                  <p className="text-xs font-bold text-slate-700 truncate">{user.mobile || 'Not defined'}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-3xl hover:bg-slate-50 transition-colors group">
                <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100">
                  <Building2 className="h-4 w-4 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Department</p>
                  <p className="text-xs font-bold text-slate-700 truncate">General Electronics</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-4">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-6 flex items-center gap-2">
              <Settings className="h-3.5 w-3.5" />
              Quick Actions
            </h2>
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-3 space-y-1">
              <button
                className="w-full flex items-center gap-4 p-4 rounded-3xl hover:bg-indigo-50/50 transition-all group"
                onClick={() => window.location.href = '/settings'}
              >
                <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <Settings className="h-4 w-4" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-xs font-bold text-slate-700">Account Settings</p>
                  <p className="text-[9px] font-medium text-slate-400">Manage your profile</p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
              </button>

              <button className="w-full flex items-center gap-4 p-4 rounded-3xl hover:bg-orange-50/50 transition-all group">
                <div className="h-10 w-10 rounded-xl bg-orange-50 flex items-center justify-center border border-orange-100 group-hover:bg-orange-500 group-hover:text-white transition-all">
                  <Bell className="h-4 w-4" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-xs font-bold text-slate-700">Notifications</p>
                  <p className="text-[9px] font-medium text-slate-400">Custom alert settings</p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
              </button>

              <button
                className="w-full flex items-center gap-4 p-4 rounded-3xl hover:bg-red-50/50 transition-all group"
                onClick={() => setIsLogoutDialogOpen(true)}
              >
                <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center border border-red-100 group-hover:bg-red-500 group-hover:text-white transition-all">
                  <LogOut className="h-4 w-4" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-xs font-bold text-red-600">Sign Out</p>
                  <p className="text-[9px] font-medium text-red-400/70">Securely exit session</p>
                </div>
                <ChevronRight className="h-4 w-4 text-red-300 group-hover:text-red-500 group-hover:translate-x-1 transition-all" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <ProfileDialog isOpen={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen} />

      <AlertDialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
        <AlertDialogContent className="glass-deep border-0 rounded-[2.5rem] p-8">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black text-slate-800">
              Confirm Logout
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base font-medium text-slate-500 mt-2">
              Are you sure you want to log out of the system?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="h-12 px-8 rounded-2xl border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-all">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={logout}
              className="h-12 px-8 rounded-2xl gradient-primary font-bold text-white shadow-lg shadow-indigo-200 border-0 hover:scale-105 active:scale-95 transition-all"
            >
              Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProfilePage;
