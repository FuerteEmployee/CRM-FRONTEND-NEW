import { useState, useEffect } from "react";
import { usePermissionContext } from "@/context/PermissionContext";
import { useMutation } from "@tanstack/react-query";
import { staffService } from "@/api/services/staff.service";
import { toast } from "sonner";
import { Mail, Phone, Shield, Save, Loader2, Eye, EyeOff, Lock, User } from "lucide-react";

export default function SuperAdminProfile() {
  const { user, refreshPermissions } = usePermissionContext();

  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [email, setEmail] = useState("");
  const [phonenumber, setPhonenumber] = useState("");

  const [pwdData, setPwdData] = useState({ newPassword: "", confirmPassword: "" });
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstname(user.firstname || "");
      setLastname(user.lastname || "");
      setEmail(user.email || "");
      setPhonenumber((user as any).phonenumber || "");
    }
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => staffService.update(user?._id, data),
    onSuccess: () => {
      toast.success("Profile updated successfully!");
      refreshPermissions();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to update profile");
    },
  });

  const passwordMutation = useMutation({
    mutationFn: (data: any) => staffService.update(user?._id, data),
    onSuccess: () => {
      toast.success("Password changed successfully!");
      setPwdData({ newPassword: "", confirmPassword: "" });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to change password");
    },
  });

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?._id) return;
    if (!firstname.trim()) { toast.error("First name is required"); return; }
    if (!email.trim()) { toast.error("Email is required"); return; }
    updateMutation.mutate({ firstname: firstname.trim(), lastname: lastname.trim(), email: email.trim(), phonenumber: phonenumber.trim() });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?._id) return;
    if (pwdData.newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (pwdData.newPassword !== pwdData.confirmPassword) { toast.error("Passwords do not match"); return; }
    passwordMutation.mutate({ password: pwdData.newPassword });
  };

  const initials = user
    ? `${user.firstname?.[0] || ""}${user.lastname?.[0] || ""}`.toUpperCase()
    : "SA";

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your Super Admin account</p>
      </div>

      {/* Avatar card */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 flex items-center gap-4">
        <div className="h-14 w-14 rounded-full bg-blue-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
          {initials}
        </div>
        <div>
          <p className="text-base font-bold text-gray-900">{user?.firstname} {user?.lastname}</p>
          <span className="inline-flex items-center gap-1.5 mt-1 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full">
            <Shield className="h-3 w-3" />
            Super Admin
          </span>
        </div>
      </div>

      {/* Account details form */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-5">Account Details</h2>
        <form onSubmit={handleSaveProfile} className="space-y-4">

          {/* Name */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                First Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={firstname}
                  onChange={(e) => setFirstname(e.target.value)}
                  placeholder="First name"
                  className="w-full h-9 pl-9 pr-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Last Name
              </label>
              <input
                type="text"
                value={lastname}
                onChange={(e) => setLastname(e.target.value)}
                placeholder="Last name"
                className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
          </div>

          {/* Email — required */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Email <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full h-9 pl-9 pr-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
          </div>

          {/* Phone — optional */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Phone Number <span className="text-gray-400 font-normal normal-case">(optional)</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="tel"
                value={phonenumber}
                onChange={(e) => setPhonenumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                maxLength={10}
                inputMode="numeric"
                placeholder="Phone number"
                className="w-full h-9 pl-9 pr-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
          </div>

          <div className="pt-1">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>

      {/* Change password */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <Lock className="h-4 w-4 text-gray-400" />
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Change Password</h2>
        </div>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              New Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                name="newPassword"
                type={showNew ? "text" : "password"}
                value={pwdData.newPassword}
                onChange={(e) => setPwdData((p) => ({ ...p, newPassword: e.target.value }))}
                placeholder="Enter new password"
                className="w-full h-9 px-3 pr-10 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
              <button type="button" onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                name="confirmPassword"
                type={showConfirm ? "text" : "password"}
                value={pwdData.confirmPassword}
                onChange={(e) => setPwdData((p) => ({ ...p, confirmPassword: e.target.value }))}
                placeholder="Re-enter new password"
                className="w-full h-9 px-3 pr-10 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
              <button type="button" onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {pwdData.confirmPassword && pwdData.newPassword !== pwdData.confirmPassword && (
              <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
            )}
          </div>

          <div className="pt-1">
            <button
              type="submit"
              disabled={passwordMutation.isPending || !pwdData.newPassword || !pwdData.confirmPassword}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {passwordMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              Update Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
