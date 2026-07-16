import React, { useEffect, useState } from "react";
import {
  CreditCard, TrendingUp, IndianRupee, Activity,
  Zap, Globe, Shield, Clock, CheckCircle2, ArrowRight, Package
} from "lucide-react";
import { apiClient as api } from "@/api/client";
import { SuperAdminBillingSkeleton } from "@/components/ui/page-skeleton";
import { useMinimumLoading } from "@/hooks/useMinimumLoading";

interface Tenant {
  _id: string;
  company_name: string;
  status: "active" | "inactive" | "trial" | "expired";
  plan_id: { name: string; price: number } | null;
  createdAt: string;
  billing_cycle_end?: string;
}

const PAYMENT_GATEWAYS = [
  {
    name: "Stripe",
    description: "Global card payments, subscriptions & auto-renewal",
    icon: "💳",
    status: "Planned",
  },
  {
    name: "Razorpay",
    description: "India-focused UPI, NEFT, EMI & auto-debit",
    icon: "🇮🇳",
    status: "Planned",
  },
  {
    name: "PayPal",
    description: "International payments & recurring billing",
    icon: "🌐",
    status: "Planned",
  },
];

const BILLING_FEATURES = [
  {
    icon: Zap,
    title: "Auto-debit EMI",
    description: "Automatically debit subscription fees from the customer's registered payment method on billing cycle renewal.",
    color: "text-yellow-500 bg-yellow-50",
  },
  {
    icon: Globe,
    title: "Multi-gateway Support",
    description: "Integrate Stripe, Razorpay, and PayPal to support customers across different regions and payment preferences.",
    color: "text-blue-500 bg-blue-50",
  },
  {
    icon: Shield,
    title: "Dunning Management",
    description: "Automated retry logic for failed payments — notify customers and retry before marking accounts as expired.",
    color: "text-indigo-500 bg-indigo-50",
  },
  {
    icon: Clock,
    title: "Billing Cycle Tracking",
    description: "Track each customer's billing cycle start/end, send reminders before renewal, and auto-update status on expiry.",
    color: "text-emerald-500 bg-emerald-50",
  },
];

export default function SuperAdminBilling() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const showBillingSkeleton = useMinimumLoading(loading);

  useEffect(() => {
    api.get("/super-admin/tenants")
      .then((res: Tenant[]) => setTenants(res))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const activeTenants = tenants.filter((t) => t.status === "active");
  const trialTenants = tenants.filter((t) => t.status === "trial");

  const mrr = activeTenants.reduce((sum, t) => {
    const price = t.plan_id && typeof t.plan_id === "object" ? t.plan_id.price : 0;
    return sum + price;
  }, 0);

  const stats = [
    { label: "Est. Monthly Revenue", value: `₹${mrr.toFixed(2)}`, icon: IndianRupee, color: "bg-blue-50 text-blue-600", sub: "From active subscriptions" },
    { label: "Active Subscriptions", value: activeTenants.length.toString(), icon: CreditCard, color: "bg-emerald-50 text-emerald-600", sub: "Paying customers" },
    { label: "Trial Customers", value: trialTenants.length.toString(), icon: TrendingUp, color: "bg-indigo-50 text-indigo-600", sub: "Pending conversion" },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Billing</h1>
        <p className="text-gray-500 text-sm mt-1">
          CRM subscription billing overview and upcoming payment gateway integration roadmap.
        </p>
      </div>

      {/* Stats */}
      {showBillingSkeleton ? (
        <SuperAdminBillingSkeleton />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-lg ${stat.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium text-gray-500">{stat.label}</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-400 mt-1">{stat.sub}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Current billing summary table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900">Current Subscriptions</h2>
          <span className="text-xs text-gray-400">{activeTenants.length} active customer{activeTenants.length !== 1 ? "s" : ""}</span>
        </div>
        {activeTenants.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">No active subscriptions yet.</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Plan</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {activeTenants.map((t) => (
                <tr key={t._id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{t.company_name}</td>
                  <td className="px-5 py-3 text-gray-600">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-gray-300" />
                      {t.plan_id && typeof t.plan_id === "object" ? t.plan_id.name : "—"}
                    </div>
                  </td>
                  <td className="px-5 py-3 font-semibold text-gray-900">
                    ₹{t.plan_id && typeof t.plan_id === "object" ? t.plan_id.price.toFixed(2) : "0.00"}
                    <span className="text-xs font-normal text-gray-400">/mo</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="h-3 w-3" /> Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Integration roadmap — hidden until payment gateway is implemented
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-start gap-4">
          <div className="p-2.5 rounded-lg bg-blue-50 flex-shrink-0">
            <CreditCard className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Payment Gateway Integration — Roadmap</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Automated billing will be enabled when a payment gateway is integrated. Subscription fees will be auto-debited from the customer's account on each billing cycle.
            </p>
          </div>
          <span className="ml-auto flex-shrink-0 text-[10px] font-bold uppercase tracking-wider bg-yellow-100 text-yellow-700 border border-yellow-200 px-2.5 py-1 rounded-full">
            Coming Soon
          </span>
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {BILLING_FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="flex items-start gap-3 p-4 border border-gray-100 rounded-xl bg-gray-50">
                <div className={`p-2 rounded-lg flex-shrink-0 ${f.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{f.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{f.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-6 pb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Planned Gateways</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PAYMENT_GATEWAYS.map((gw) => (
              <div key={gw.name} className="flex items-center gap-3 p-4 border border-dashed border-gray-200 rounded-xl bg-white hover:border-blue-200 hover:bg-blue-50/30 transition-colors">
                <span className="text-2xl">{gw.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{gw.name}</p>
                  <p className="text-xs text-gray-400 truncate">{gw.description}</p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex-shrink-0 flex items-center gap-1">
                  <ArrowRight className="h-3 w-3" />
                  {gw.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      */}
    </div>
  );
}
