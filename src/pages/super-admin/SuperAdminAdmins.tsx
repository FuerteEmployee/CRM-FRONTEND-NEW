import React, { useEffect, useState } from "react";
import { Users, Plus, Edit2, Trash2, ShieldCheck, Building2, Search, X, Activity } from "lucide-react";
import { apiClient as api } from "@/api/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface Admin {
  _id: string;
  firstname: string;
  lastname: string;
  email: string;
  is_superadmin: boolean;
  active: boolean;
  tenant_id: { _id: string; company_name: string } | null;
  createdAt: string;
}

interface Tenant {
  _id: string;
  company_name: string;
}

export default function SuperAdminAdmins() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    firstname: "",
    lastname: "",
    email: "",
    password: "",
    is_superadmin: false,
    tenant_id: "",
    active: true,
  });

  const fetchData = async () => {
    try {
      const [adminsRes, tenantsRes] = await Promise.all([
        api.get("/super-admin/admins"),
        api.get("/super-admin/tenants")
      ]);
      setAdmins(adminsRes);
      setTenants(tenantsRes);
    } catch (error: any) {
      toast.error(error.message || "Failed to load admins");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setEditingAdmin(null);
    setFormData({
      firstname: "",
      lastname: "",
      email: "",
      password: "",
      is_superadmin: false,
      tenant_id: "",
      active: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (admin: Admin) => {
    setEditingAdmin(admin);
    setFormData({
      firstname: admin.firstname,
      lastname: admin.lastname,
      email: admin.email,
      password: "", // empty for edit
      is_superadmin: admin.is_superadmin,
      tenant_id: admin.tenant_id?._id || "",
      active: admin.active,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this admin account?")) return;
    try {
      await api.delete(`/super-admin/admins/${id}`);
      toast.success("Admin deleted successfully");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete admin");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAdmin) {
        // Update
        const payload: any = { ...formData };
        if (!payload.password) delete payload.password; // Don't send empty password

        await api.put(`/super-admin/admins/${editingAdmin._id}`, payload);
        toast.success("Admin updated successfully");
      } else {
        // Create
        if (!formData.password) {
          return toast.error("Password is required for new accounts");
        }
        await api.post("/super-admin/admins", formData);
        toast.success("Admin created successfully");
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to save admin");
    }
  };

  const filteredAdmins = admins.filter(a => 
    a.firstname.toLowerCase().includes(search.toLowerCase()) || 
    a.lastname.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Admin Management</h1>
          <p className="text-gray-500 text-sm mt-1">Create, assign, and manage global Super Admins and local Tenant Admins.</p>
        </div>
        <Button onClick={openCreateModal} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
          <Plus className="h-4 w-4" />
          Create Admin
        </Button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-200 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors placeholder:text-gray-400"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="text-xs uppercase bg-gray-50 text-gray-500 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3.5 font-semibold tracking-wide">User</th>
                <th className="px-6 py-3.5 font-semibold tracking-wide">Role</th>
                <th className="px-6 py-3.5 font-semibold tracking-wide">Tenant / Workspace</th>
                <th className="px-6 py-3.5 font-semibold tracking-wide">Status</th>
                <th className="px-6 py-3.5 font-semibold tracking-wide text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-400">
                    <Activity className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-500" />
                    Loading admins...
                  </td>
                </tr>
              ) : filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-400">
                    No admins found.
                  </td>
                </tr>
              ) : (
                filteredAdmins.map((admin) => (
                  <tr key={admin._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
                          {admin.firstname[0]}{admin.lastname[0]}
                        </div>
                        <div>
                          <div className="text-gray-900 font-medium text-sm">{admin.firstname} {admin.lastname}</div>
                          <div className="text-gray-400 text-xs">{admin.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {admin.is_superadmin ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Super Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          <Users className="h-3.5 w-3.5" />
                          Tenant Admin
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {admin.is_superadmin ? (
                        <span className="text-gray-400 italic text-sm">Global System</span>
                      ) : admin.tenant_id ? (
                        <div className="flex items-center gap-2 text-gray-700">
                          <Building2 className="h-4 w-4 text-emerald-500" />
                          <span className="text-sm">{admin.tenant_id.company_name}</span>
                        </div>
                      ) : (
                        <span className="text-orange-600 text-xs font-medium bg-orange-50 px-2 py-1 rounded-md border border-orange-200">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {admin.active ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-red-700 bg-red-50 border border-red-200">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          Suspended
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(admin)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Admin"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(admin._id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Admin"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    {/* Create / Edit Modal */}
    {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white border border-gray-200 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                {editingAdmin ? <Edit2 className="h-4 w-4 text-blue-600" /> : <Plus className="h-4 w-4 text-blue-600" />}
                {editingAdmin ? "Edit Admin Account" : "Create Admin Account"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">First Name</label>
                  <input
                    type="text"
                    required
                    value={formData.firstname}
                    onChange={(e) => setFormData({...formData, firstname: e.target.value})}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Last Name</label>
                  <input
                    type="text"
                    required
                    value={formData.lastname}
                    onChange={(e) => setFormData({...formData, lastname: e.target.value})}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Password {editingAdmin && <span className="text-gray-400 lowercase normal-case ml-1">(Leave blank to keep current)</span>}
                </label>
                <input
                  type="password"
                  required={!editingAdmin}
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-4">
                <div className="flex items-center justify-between p-3.5 bg-gray-50 border border-gray-200 rounded-lg">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-indigo-600" />
                      Super Admin Privilege
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">Grants global access to this dashboard.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={formData.is_superadmin}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          is_superadmin: e.target.checked,
                          tenant_id: e.target.checked ? "" : formData.tenant_id
                        });
                      }}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {!formData.is_superadmin && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                      Assign to Workspace (Tenant)
                    </label>
                    <select
                      value={formData.tenant_id}
                      onChange={(e) => setFormData({...formData, tenant_id: e.target.value})}
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    >
                      <option value="">-- Select a Workspace --</option>
                      {tenants.map(t => (
                        <option key={t._id} value={t._id}>{t.company_name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {editingAdmin && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="active-toggle"
                      checked={formData.active}
                      onChange={(e) => setFormData({...formData, active: e.target.checked})}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="active-toggle" className="text-sm text-gray-700">Account is Active</label>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <Button type="button" onClick={() => setIsModalOpen(false)} variant="ghost" className="text-gray-600 hover:text-gray-900 hover:bg-gray-100">
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                  {editingAdmin ? "Save Changes" : "Create Admin"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
