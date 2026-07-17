import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/context/SettingsContext";
import { resolveImageUrl } from "@/lib/resolveImageUrl";

const ClientLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { settings } = useSettings();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Mock login — store client session so root redirect knows who is logged in
    setTimeout(() => {
      setIsLoading(false);
      localStorage.setItem("crm_client", JSON.stringify({ email }));
      toast({
        title: "Login Successful",
        description: "Welcome back to your project portal.",
      });
      navigate("/dashboard");
    }, 1000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {/* Mini Header */}
      <header className="w-full h-14 border-b bg-white flex items-center justify-between px-6 md:px-10">
        <div className="flex items-center gap-2">
           {settings?.compLogoDark ? (
             <img src={resolveImageUrl(settings.compLogoDark)} alt="Logo" className="h-8 w-auto object-contain" />
           ) : (
             <>
                <div className="flex h-7 w-7 items-center justify-center rounded bg-primary font-bold text-[10px] uppercase shadow-sm">
                   {settings?.companyName?.charAt(0) || "C"}
                </div>
                <span className="font-bold text-lg tracking-tight">
                  {settings?.companyName?.split(" ")[0] || "CRM"}<span className="text-primary">{settings?.companyName?.split(" ").slice(1).join(" ") || "Pro"}</span>
                </span>
             </>
           )}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="text-muted-foreground font-medium text-xs hover:bg-muted/50 transition-colors h-8" asChild>
            <Link to="/knowledge-base">Knowledge Base</Link>
          </Button>
          <Button size="sm" className="bg-[#2563EB] hover:bg-[#1D4ED8] gap-1.5 font-medium text-xs shadow-sm h-8 active:scale-95 transition-all">
             <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5"
            >
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Login
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6 bg-gradient-to-b from-white to-[#F8FAFC]">
        <div className="w-full max-w-[380px] animate-fade-in">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-[#1E293B] mb-1.5">Please login</h1>
            <p className="text-[#64748B] text-xs font-medium uppercase tracking-wide opacity-80">Enter your credentials to access your dashboard</p>
          </div>

          <div className="bg-white rounded-xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-[#E2E8F0] p-6 md:p-8 transition-all">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] ml-0.5">Language</label>
                <select className="flex h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm ring-offset-background transition-colors focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/5">
                  <option>{settings?.locLanguage || "English"}</option>
                  {!settings?.locDisableLanguages && (
                    <>
                      <option>Spanish</option>
                      <option>French</option>
                      <option>German</option>
                    </>
                  )}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] ml-0.5">Email Address</label>
                <Input
                  type="email"
                  placeholder="bhaveshfuerte@gmail.com"
                  className="h-10 rounded-lg border-[#E2E8F0] px-3 text-sm focus:ring-2 focus:ring-[#2563EB]/5 focus:border-[#2563EB] transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5 relative">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] ml-0.5">Password</label>
                <Input
                  type="password"
                  placeholder="**********"
                  className="h-10 rounded-lg border-[#E2E8F0] px-3 text-sm focus:ring-2 focus:ring-[#2563EB]/5 focus:border-[#2563EB] transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="flex items-center space-x-2 py-0.5">
                <Checkbox id="remember" className="h-4 w-4 rounded border-[#E2E8F0] data-[state=checked]:bg-[#2563EB] data-[state=checked]:border-[#2563EB] transition-all" />
                <label
                  htmlFor="remember"
                  className="text-xs font-medium text-[#64748B] cursor-pointer"
                >
                  Remember me
                </label>
              </div>

              <Button
                type="submit"
                className="w-full h-10 bg-[#1E293B] hover:bg-[#0F172A] rounded-lg text-sm font-bold transition-all shadow-md shadow-gray-100 active:scale-95 mt-2"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Login"}
              </Button>

              <div className="text-center pt-1">
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-[#64748B] hover:text-[#2563EB] transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>
            </form>
          </div>

          <div className="mt-8 flex justify-center items-center gap-2 text-[#64748B] text-[10px] font-bold uppercase tracking-widest opacity-60">
            <div className="flex items-center gap-1.5">
                <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3 w-3"
                >
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span>Secure Client Portal</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ClientLogin;
