import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Zap, ArrowRight, BarChart3, Users, CheckCircle2, Check } from "lucide-react";
import { toast } from "sonner";
import { publicService } from "@/api/services/public.service";
import { useSettings } from "@/context/SettingsContext";
import { resolveImageUrl } from "@/lib/resolveImageUrl";

const features = [
  { icon: BarChart3, label: "Real-time Analytics" },
  { icon: Users, label: "Team Collaboration" },
  { icon: CheckCircle2, label: "Smart Task Management" },
];

type Plan = {
  _id: string;
  name: string;
  description?: string;
  price: number;
  billing_cycle: "monthly" | "yearly" | "lifetime";
  features?: { max_users?: number; max_storage_gb?: number; max_customers?: number };
};

const billingLabel = (cycle: Plan["billing_cycle"]) =>
  cycle === "yearly" ? "/year" : cycle === "lifetime" ? " one-time" : "/month";

const LandingPage = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [contactNo, setContactNo] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    (async () => {
      const data = await publicService.getPlans();
      setPlans(data);
      if (data.length) setSelectedPlanId(data[0]._id);
      setPlansLoading(false);
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!companyName.trim() || !email.trim() || !password || !confirmPassword) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Password and confirm password do not match.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setSubmitting(true);
    try {
      await publicService.signup({
        company_name: companyName.trim(),
        email: email.trim(),
        contact_no: contactNo.trim(),
        password,
        confirm_password: confirmPassword,
        plan_id: selectedPlanId,
      });
      toast.success("Account created! Your 7-day free trial has started.");
      navigate("/admin/login");
    } catch (error: any) {
      toast.error(error.message || "Could not create your account. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border/60">
        <div className="flex items-center gap-2">
          {settings?.compLogoDark ? (
            <img src={resolveImageUrl(settings.compLogoDark)} alt="Logo" className="h-8 w-auto object-contain" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              {settings?.companyName?.charAt(0) || "C"}
            </div>
          )}
          <span className="text-lg font-bold">{settings?.companyName || "CRMPro"}</span>
        </div>
        <Link to="/admin/login">
          <Button variant="outline">Log In</Button>
        </Link>
      </header>

      {/* Hero */}
      <section className="px-6 py-16 text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium mb-4">
          <Zap className="h-3 w-3" />
          Powered by AI-driven insights
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
          Manage your team <span className="text-primary">like never before.</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
          The all-in-one CRM platform that helps you close more deals, retain customers, and grow your revenue.
        </p>
        <div className="flex flex-wrap justify-center gap-6">
          {features.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Icon className="h-4 w-4 text-primary" />
              {label}
            </div>
          ))}
        </div>
      </section>

      {/* Pricing + Signup */}
      <section className="px-6 pb-20 max-w-6xl mx-auto grid lg:grid-cols-[1.2fr_1fr] gap-10 items-start">
        {/* Plan cards */}
        <div>
          <h2 className="text-2xl font-bold mb-1">Choose your plan</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Every plan starts with a 7-day free trial — no credit card required.
          </p>

          {plansLoading ? (
            <p className="text-sm text-muted-foreground">Loading plans…</p>
          ) : plans.length === 0 ? (
            <p className="text-sm text-muted-foreground">No plans are available right now.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {plans.map((plan) => {
                const selected = selectedPlanId === plan._id;
                return (
                  <Card
                    key={plan._id}
                    onClick={() => setSelectedPlanId(plan._id)}
                    className={`p-5 cursor-pointer transition-all border-2 ${
                      selected ? "border-primary shadow-md" : "border-border/60 hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-lg">{plan.name}</h3>
                      {selected && (
                        <Badge className="gap-1">
                          <Check className="h-3 w-3" /> Selected
                        </Badge>
                      )}
                    </div>
                    {plan.description && (
                      <p className="text-xs text-muted-foreground mb-3">{plan.description}</p>
                    )}
                    <div className="mb-3">
                      <span className="text-2xl font-extrabold">
                        {plan.price === 0 ? "Free" : `₹${plan.price}`}
                      </span>
                      {plan.price > 0 && (
                        <span className="text-sm text-muted-foreground">{billingLabel(plan.billing_cycle)}</span>
                      )}
                    </div>
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {plan.features?.max_users != null && (
                        <li>
                          {plan.features.max_users === -1 ? "Unlimited" : plan.features.max_users} users
                        </li>
                      )}
                      {plan.features?.max_storage_gb != null && (
                        <li>
                          {plan.features.max_storage_gb === -1 ? "Unlimited" : plan.features.max_storage_gb} GB storage
                        </li>
                      )}
                      {plan.features?.max_customers != null && (
                        <li>
                          {plan.features.max_customers === -1 ? "Unlimited" : plan.features.max_customers} customers
                        </li>
                      )}
                    </ul>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Signup form */}
        <Card className="p-6">
          <div className="mb-5">
            <h2 className="text-xl font-bold">Create your account</h2>
            <p className="text-sm text-muted-foreground">Start your 7-day free trial today.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="companyName">Company / Full Name</Label>
              <Input
                id="companyName"
                placeholder="Acme Inc."
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contactNo">Contact Number</Label>
              <Input
                id="contactNo"
                type="tel"
                placeholder="+91 98765 43210"
                value={contactNo}
                onChange={(e) => setContactNo(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  disableVoice
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  disableVoice
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full h-10 font-semibold gap-2" disabled={submitting}>
              {submitting ? "Creating account…" : (
                <>
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Already have an account?{" "}
              <Link to="/admin/login" className="text-primary font-medium hover:underline">
                Log in
              </Link>
            </p>
          </form>
        </Card>
      </section>
    </div>
  );
};

export default LandingPage;
