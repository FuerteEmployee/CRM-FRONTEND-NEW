import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Zap, ArrowRight, BarChart3, Users, CheckCircle2, Check, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { publicService } from "@/api/services/public.service";
import { useSettings } from "@/context/SettingsContext";
import { resolveImageUrl } from "@/lib/resolveImageUrl";
import { motion, AnimatePresence } from "framer-motion";

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
  module_access?: Record<string, boolean>;
  is_popular?: boolean;
  trial_days?: number;
};

const billingLabel = (cycle: Plan["billing_cycle"]) =>
  cycle === "yearly" ? "/year" : cycle === "lifetime" ? " one-time" : "/month";

const LandingPage = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const { data: plans = [], isLoading: plansLoading, isError } = useQuery<Plan[]>({
    queryKey: ["public-plans"],
    queryFn: () => publicService.getPlans() as Promise<Plan[]>,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [contactNo, setContactNo] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (plans.length > 0 && !selectedPlanId) {
      setSelectedPlanId(plans[0]._id);
    }
  }, [plans, selectedPlanId]);

  const validateStep = (currentStep: number) => {
    const newErrors: Record<string, string> = {};
    if (currentStep === 1) {
      if (!companyName.trim()) newErrors.companyName = "Company / Full Name is required.";
      if (!email.trim()) newErrors.email = "Email address is required.";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = "Invalid email format.";
    }
    if (currentStep === 2) {
      if (!contactNo.trim()) newErrors.contactNo = "Contact number is required.";
      else if (contactNo.trim().length !== 10) newErrors.contactNo = "Contact number must be exactly 10 digits.";
    }
    if (currentStep === 3) {
      if (!password) newErrors.password = "Password is required.";
      else if (password.length < 6) newErrors.password = "Password must be at least 6 characters.";
      if (!confirmPassword) newErrors.confirmPassword = "Confirm password is required.";
      else if (password !== confirmPassword) newErrors.confirmPassword = "Passwords do not match.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    setErrors({});
    setStep((s) => s - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(3)) return;

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
          <span className="text-lg font-bold">{settings?.companyName || "Trinetra TechnoWorld"}</span>
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
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : isError ? (
             <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm text-center">
               Failed to load plans. Please try refreshing the page.
             </div>
          ) : plans.length === 0 ? (
            <p className="text-sm text-muted-foreground">No plans are available right now.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {plans.map((plan) => {
                const selected = selectedPlanId === plan._id;
                
                // Construct dynamic feature list
                const dynamicFeatures = [];
                if (plan.features) {
                  if (plan.features.max_users === -1) dynamicFeatures.push("Unlimited users");
                  else if (plan.features.max_users != null) dynamicFeatures.push(`Up to ${plan.features.max_users} users`);
                  
                  if (plan.features.max_storage_gb === -1) dynamicFeatures.push("Unlimited storage");
                  else if (plan.features.max_storage_gb != null) dynamicFeatures.push(`${plan.features.max_storage_gb} GB storage`);
                  
                  if (plan.features.max_customers === -1) dynamicFeatures.push("Unlimited customers");
                  else if (plan.features.max_customers != null) dynamicFeatures.push(`Up to ${plan.features.max_customers} customers`);
                }
                if (plan.module_access) {
                  Object.entries(plan.module_access).forEach(([key, val]) => {
                    if (val) dynamicFeatures.push(key.charAt(0).toUpperCase() + key.slice(1).replace("_", " "));
                  });
                }

                return (
                  <Card
                    key={plan._id}
                    onClick={() => setSelectedPlanId(plan._id)}
                    className={`relative p-4 cursor-pointer transition-all border-2 flex flex-col h-[400px] ${
                      selected ? "border-primary shadow-md" : "border-border/60 hover:border-primary/40"
                    } ${plan.is_popular ? "ring-2 ring-primary/20 bg-primary/5" : ""}`}
                  >
                    {plan.is_popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap">
                        Most Popular
                      </div>
                    )}
                    <div className="flex items-start justify-between mb-1.5 mt-0 shrink-0">
                      <h3 className="font-bold text-base flex items-center gap-2 flex-wrap leading-tight">
                        {plan.name}
                        {plan.trial_days != null && plan.trial_days > 0 && (
                          <Badge variant="outline" className="text-[9px] px-1.5 h-4 bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-950 dark:text-violet-400 dark:border-violet-800 shrink-0">
                            {plan.trial_days}-Day Trial
                          </Badge>
                        )}
                      </h3>
                      {selected && (
                        <Badge className="gap-1 bg-primary text-primary-foreground shrink-0 text-[10px] px-1.5 py-0">
                          <Check className="h-3 w-3" /> Selected
                        </Badge>
                      )}
                    </div>
                    {plan.description && (
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2 shrink-0">{plan.description}</p>
                    )}
                    <div className="mb-2 flex items-baseline gap-1 shrink-0">
                      <span className="text-xl font-extrabold">
                        {plan.price === 0 ? "Free" : `₹${plan.price.toLocaleString("en-IN")}`}
                      </span>
                      {plan.price > 0 && (
                        <span className="text-xs text-muted-foreground font-medium">{billingLabel(plan.billing_cycle)}</span>
                      )}
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-border/50 flex flex-col flex-1 min-h-0">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 shrink-0">Includes</p>
                      <div className="relative flex-1 min-h-0">
                        <ul className="space-y-1.5 text-xs text-foreground/80 overflow-y-auto h-full pr-2 pb-6 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-border/60 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-border/80">
                          {dynamicFeatures.length > 0 ? dynamicFeatures.map((f, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <CheckCircle2 className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                              <span className="leading-tight">{f}</span>
                            </li>
                          )) : (
                            <li className="flex items-start gap-1.5">
                              <CheckCircle2 className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                              <span className="leading-tight">Standard CRM features</span>
                            </li>
                          )}
                        </ul>
                        {/* Bottom fade gradient for visual scroll cue */}
                        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-card to-transparent pointer-events-none" />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Signup form */}
        <Card className="p-6 relative overflow-hidden flex flex-col min-h-[480px]">
          <div className="mb-5">
            <h2 className="text-xl font-bold">Create your account</h2>
            <p className="text-sm text-muted-foreground">Start your 7-day free trial today.</p>
          </div>

          {/* Step Indicator */}
          <div className="flex flex-col gap-2 mb-6">
            <div className="flex justify-between items-center text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <span>Step {step} of 3</span>
              {step === 1 ? <span>Details</span> : step === 2 ? <span>Contact</span> : <span>Security</span>}
            </div>
            <div className="flex gap-1.5 h-1.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`flex-1 rounded-full transition-colors duration-500 ${step >= i ? "bg-primary" : "bg-muted"}`} />
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1">
            <div className="flex-1 relative">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4 absolute inset-0"
                  >
                    <div className="space-y-1.5">
                      <Label htmlFor="companyName">Company / Full Name</Label>
                      <Input
                        id="companyName"
                        placeholder="Acme Inc."
                        value={companyName}
                        onChange={(e) => { setCompanyName(e.target.value); if(errors.companyName) setErrors({...errors, companyName: ""}); }}
                        className={errors.companyName ? "border-destructive focus-visible:ring-destructive" : ""}
                      />
                      {errors.companyName && <p className="text-[10px] text-destructive font-medium">{errors.companyName}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="email">Email address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@company.com"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); if(errors.email) setErrors({...errors, email: ""}); }}
                        className={errors.email ? "border-destructive focus-visible:ring-destructive" : ""}
                      />
                      {errors.email && <p className="text-[10px] text-destructive font-medium">{errors.email}</p>}
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4 absolute inset-0"
                  >
                    <div className="space-y-1.5">
                      <Label htmlFor="contactNo">Contact Number</Label>
                      <Input
                        id="contactNo"
                        type="tel"
                        placeholder="9876543210"
                        value={contactNo}
                        onChange={(e) => { setContactNo(e.target.value.replace(/\D/g, "").slice(0, 10)); if(errors.contactNo) setErrors({...errors, contactNo: ""}); }}
                        maxLength={10}
                        inputMode="numeric"
                        className={errors.contactNo ? "border-destructive focus-visible:ring-destructive" : ""}
                      />
                      {errors.contactNo && <p className="text-[10px] text-destructive font-medium">{errors.contactNo}</p>}
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4 absolute inset-0"
                  >
                    <div className="space-y-1.5">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          disableVoice
                          placeholder="At least 6 characters"
                          value={password}
                          onChange={(e) => { setPassword(e.target.value); if(errors.password) setErrors({...errors, password: ""}); }}
                          className={`pr-10 ${errors.password ? "border-destructive focus-visible:ring-destructive" : ""}`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {errors.password && <p className="text-[10px] text-destructive font-medium">{errors.password}</p>}
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
                          onChange={(e) => { setConfirmPassword(e.target.value); if(errors.confirmPassword) setErrors({...errors, confirmPassword: ""}); }}
                          className={`pr-10 ${errors.confirmPassword ? "border-destructive focus-visible:ring-destructive" : ""}`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {errors.confirmPassword && <p className="text-[10px] text-destructive font-medium">{errors.confirmPassword}</p>}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="mt-8 pt-4 flex flex-col gap-3 relative z-10">
              <div className="flex gap-3">
                {step > 1 && (
                  <Button type="button" variant="outline" className="h-10 px-4" onClick={handleBack} disabled={submitting}>
                    <ChevronLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                )}
                {step < 3 ? (
                  <Button type="button" className="flex-1 h-10 font-semibold gap-2" onClick={handleNext}>
                    Next <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="submit" className="flex-1 h-10 font-semibold gap-2" disabled={submitting}>
                    {submitting ? "Creating account…" : (
                      <>Start Free Trial <ArrowRight className="h-4 w-4" /></>
                    )}
                  </Button>
                )}
              </div>
              {step === 1 && (
                <p className="text-xs text-center text-muted-foreground">
                  Already have an account?{" "}
                  <Link to="/admin/login" className="text-primary font-medium hover:underline">
                    Log in
                  </Link>
                </p>
              )}
            </div>
          </form>
        </Card>
      </section>
    </div>
  );
};

export default LandingPage;
