import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Eye,
  EyeOff,
  Zap,
  ArrowRight,
  BarChart3,
  Users,
  CheckCircle2,
} from "lucide-react";

import { authService } from "@/api/services/auth.service";
import { toast } from "sonner";
import { usePermissionContext } from "@/context/PermissionContext";
import { useSettings } from "@/context/SettingsContext";
import { useCurrency } from "@/context/CurrencyContext";
import { resolveImageUrl } from "@/lib/resolveImageUrl";
import { getLandingPath } from "@/lib/landingPath";
import { AlreadyLoggedInBanner } from "@/components/auth/AlreadyLoggedInBanner";

const features = [
  { icon: BarChart3, label: "Real-time Analytics" },
  { icon: Users, label: "Team Collaboration" },
  { icon: CheckCircle2, label: "Smart Task Management" },
];

const Login = () => {
  const navigate = useNavigate();
  const { setFromLoginResponse } = usePermissionContext();
  const { settings, refreshSettings } = useSettings();
  const { refetch: refetchCurrencies } = useCurrency();
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("admin");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [logoLightError, setLogoLightError] = useState(false);
  const [logoDarkError, setLogoDarkError] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await authService.login({ email, password });
      if (response.requires2FA) {
        toast.info("2FA Check Required. Please verify your identity.");
        // In a real app, you'd navigate to a 2FA page or show a modal
      } else {
        toast.success("Welcome back!");
        setFromLoginResponse(response.user, response.permissions, response.plan_modules);
        // Reload settings with the new auth token so this admin's own
        // branding (logo, favicon, company name) applies immediately
        refreshSettings();
        // Currency queries are disabled until a token exists (avoids a 401
        // on the public login page) — fetch now that we just logged in.
        refetchCurrencies();
        const userAdmin = response.user?.admin;
        const isAdmin = userAdmin === true || userAdmin === 1 || userAdmin === "1" || userAdmin === "true";
        navigate(getLandingPath(response.user, response.permissions, !isAdmin && !response.user?.is_superadmin));
      }
    } catch (error: any) {
      toast.error(error.message || "Invalid credentials. Please try again.");
      console.error("Login error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Panel — Brand Side */}
      <div className="hidden lg:flex lg:w-[55%] relative flex-col justify-between overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-12 text-white">
        {/* Background decorative circles */}
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute top-1/2 left-1/3 h-64 w-64 rounded-full bg-white/5 blur-2xl" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          {settings?.compLogoLight && !logoLightError ? (
            <div className="flex items-center gap-2">
              <img src={resolveImageUrl(settings.compLogoLight)} alt="Logo" className="h-10 w-auto object-contain" onError={() => setLogoLightError(true)} />
            </div>
          ) : (
            <>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-primary font-extrabold text-lg shadow-lg">
                {settings?.companyName?.charAt(0) || "C"}
              </div>
              <span className="text-2xl font-bold tracking-tight">
                {settings?.companyName}
              </span>
            </>
          )}
        </div>

        {/* Hero Text */}
        <div className="relative z-10 space-y-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">
              <Zap className="h-3 w-3" />
              Powered by AI-driven insights
            </div>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight">
              Manage your team
              <br />
              <span className="text-white/80">like never before.</span>
            </h1>
            <p className="text-base text-white/70 max-w-sm leading-relaxed">
              The all-in-one CRM platform that helps you close more deals,
              retain customers, and grow your revenue.
            </p>
          </div>

          {/* Feature Badges */}
          <div className="flex flex-col gap-3">
            {features.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-medium text-white/90">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer quote */}
        <div className="relative z-10 border-t border-white/20 pt-6">
          <p className="text-sm italic text-white/60">
            "CRMPro transformed the way our team collaborates and closes deals."
          </p>
          <p className="mt-2 text-xs text-white/40 font-medium">
            — Sarah K., VP of Sales at TechCorp
          </p>
        </div>
      </div>

      {/* Right Panel — Form Side */}
      <div className="flex w-full lg:w-[45%] flex-col items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center justify-center gap-2 mb-2">
            {settings?.compLogoDark && !logoDarkError ? (
              <div className="flex items-center gap-2">
                <img src={resolveImageUrl(settings.compLogoDark)} alt="Logo" className="h-9 w-auto object-contain" onError={() => setLogoDarkError(true)} />
              </div>
            ) : (
              <>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-base">
                  {settings?.companyName?.charAt(0) || "C"}
                </div>
                <span className="text-xl font-bold">
                  {settings?.companyName}
                </span>
              </>
            )}
          </div>

          {/* Header */}
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Welcome back
            </h2>
            <p className="text-sm text-muted-foreground">
              Sign in to your account to continue
            </p>
          </div>

          <AlreadyLoggedInBanner />

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter Your Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 bg-muted/40 border-border/60 focus-visible:bg-background transition-colors"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <Link
                  to="/admin/forgot-password"
                  className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  disableVoice
                  placeholder="Enter Your Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 pr-10 bg-muted/40 border-border/60 focus-visible:bg-background transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full h-10 font-semibold gap-2 shadow-sm"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  Signing in...
                </span>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Footer */}
          <p className="text-sm text-center text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link to="/welcome" className="text-primary font-medium hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
