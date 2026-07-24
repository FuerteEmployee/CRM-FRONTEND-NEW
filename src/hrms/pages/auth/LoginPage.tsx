import React, { useState } from "react";
import { useAuth } from "@/hrms/contexts/AuthContext";
import { Button } from "@/hrms/components/ui/button";
import { Input } from "@/hrms/components/ui/input";
import { Label } from "@/hrms/components/ui/label";
import { Eye, EyeOff, Mail, Lock, AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/hrms/lib/utils";

const PARTICLES = [
  { size: 5, left: 8,  delay: 0.0, dur: 3.8 },
  { size: 4, left: 18, delay: 0.9, dur: 4.5 },
  { size: 7, left: 30, delay: 1.6, dur: 3.4 },
  { size: 3, left: 45, delay: 0.4, dur: 5.0 },
  { size: 5, left: 58, delay: 1.3, dur: 3.6 },
  { size: 4, left: 72, delay: 2.1, dur: 4.2 },
  { size: 6, left: 85, delay: 0.7, dur: 3.9 },
  { size: 3, left: 95, delay: 2.7, dur: 4.6 },
];

const SPARKLES = [
  { top: "12%", left: "7%",  delay: 0.0, dur: 2.4, size: 14 },
  { top: "20%", left: "88%", delay: 0.7, dur: 3.1, size: 10 },
  { top: "55%", left: "5%",  delay: 1.4, dur: 2.8, size: 12 },
  { top: "75%", left: "90%", delay: 0.3, dur: 2.2, size: 10 },
  { top: "8%",  left: "55%", delay: 1.9, dur: 3.4, size: 11 },
  { top: "85%", left: "30%", delay: 0.9, dur: 2.6, size: 13 },
];

const COMPANY = "Screen Time Digital";

const LoginPage = () => {
  const { login } = useAuth();
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [error, setError]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [showPwd, setShowPwd]       = useState(false);
  const [devicePending, setDevicePending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setDevicePending(false);
    setLoading(true);
    const errorMsg = await login(email, password);
    if (errorMsg === "__device_pending__") {
      setDevicePending(true);
    } else if (errorMsg) {
      setError(errorMsg);
    }
    setLoading(false);
  };

  const isEmailError    = !!error && (error.toLowerCase().includes("email") || error.toLowerCase().includes("account") || error.toLowerCase().includes("found"));
  const isPasswordError = !!error && error.toLowerCase().includes("password");

  return (
    <>
      <style>{`
        @keyframes splashScale {
          0%   { opacity:0; transform:scale(0.45) rotate(-8deg); }
          60%  { opacity:1; transform:scale(1.1)  rotate(2deg);  }
          80%  { transform:scale(0.97) rotate(-1deg); }
          100% { opacity:1; transform:scale(1)   rotate(0deg);  }
        }
        @keyframes floatY {
          0%,100% { transform:translateY(0);     }
          50%      { transform:translateY(-18px); }
        }
        @keyframes letterPop {
          0%   { opacity:0; transform:translateY(22px) scale(0.6); }
          55%  { transform:translateY(-5px) scale(1.1); }
          100% { opacity:1; transform:translateY(0) scale(1); }
        }
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(12px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes textGlow {
          0%,100% { text-shadow:0 0 12px rgba(255,255,255,0.2); }
          50%      { text-shadow:0 0 28px rgba(255,255,255,0.7), 0 0 55px rgba(255,255,255,0.3); }
        }
        @keyframes underlineGrow {
          from { width:0; opacity:0; }
          to   { width:100%; opacity:1; }
        }
        @keyframes ringPulse {
          0%,100% { transform:scale(1);    opacity:0.45; }
          50%      { transform:scale(1.22); opacity:0.07; }
        }
        @keyframes ringPulse2 {
          0%,100% { transform:scale(1);    opacity:0.28; }
          50%      { transform:scale(1.28); opacity:0.04; }
        }
        @keyframes rotateCW  { to { transform:rotate(360deg);  } }
        @keyframes rotateCCW { to { transform:rotate(-360deg); } }
        @keyframes blob1 {
          0%,100% { transform:translate(0,0)       scale(1);    }
          40%      { transform:translate(30px,-22px)  scale(1.08); }
          70%      { transform:translate(-18px,16px)  scale(0.94); }
        }
        @keyframes blob2 {
          0%,100% { transform:translate(0,0)       scale(1);    }
          35%      { transform:translate(-24px,20px)  scale(1.06); }
          65%      { transform:translate(16px,-14px)  scale(0.96); }
        }
        @keyframes particleRise {
          0%   { opacity:0;    transform:translateY(0)      scale(0);   }
          12%  { opacity:0.85; transform:scale(1); }
          85%  { opacity:0.5; }
          100% { opacity:0;    transform:translateY(-200px) scale(0.3); }
        }
        @keyframes shimmer {
          0%   { left:-90%; }
          100% { left:160%; }
        }
        @keyframes glowBreath {
          0%,100% { box-shadow:0 28px 70px rgba(0,0,0,0.22), 0 0 0    0   rgba(255,255,255,0.18); }
          50%      { box-shadow:0 28px 70px rgba(0,0,0,0.22), 0 0 50px 14px rgba(255,255,255,0.1); }
        }
        @keyframes sparkle {
          0%,100% { opacity:0; transform:scale(0) rotate(0deg);  }
          30%,70% { opacity:1; transform:scale(1) rotate(90deg); }
        }
        @keyframes orbitCW { to { transform:rotate(360deg); } }

        .anim-logo      { animation: splashScale 0.9s cubic-bezier(0.34,1.4,0.64,1) 0.2s both; }
        .anim-float     { animation: floatY      5.5s ease-in-out 1.4s infinite; }
        .anim-letter    { animation: letterPop   0.5s cubic-bezier(0.34,1.56,0.64,1) both; }
        .anim-sub       { animation: fadeUp      0.55s ease both; }
        .anim-glow      { animation: glowBreath  3.5s ease-in-out infinite; }
        .anim-textglow  { animation: textGlow    2.8s ease-in-out 2s infinite; }
        .anim-underline { animation: underlineGrow 0.8s cubic-bezier(0.16,1,0.3,1) 2.2s both; }
        .ring-pulse-1   { animation: ringPulse   3.8s ease-in-out infinite; }
        .ring-pulse-2   { animation: ringPulse2  3.8s ease-in-out 1.4s infinite; }
        .ring-spin-cw   { animation: rotateCW   20s linear infinite; }
        .ring-spin-ccw  { animation: rotateCCW  28s linear infinite; }
        .blob-a         { animation: blob1  10s ease-in-out infinite; }
        .blob-b         { animation: blob2  13s ease-in-out 2s infinite; }
        .particle       { animation: particleRise ease-out infinite; }
        .card-shimmer   { animation: shimmer  4s ease-in-out 2.5s infinite; }
        .sparkle-el     { animation: sparkle ease-in-out infinite; }
        .orbit-1        { animation: orbitCW  4s linear 0s    infinite; }
        .orbit-2        { animation: orbitCW  6s linear 1.33s infinite; }
        .orbit-3        { animation: orbitCW  5s linear 2.66s infinite; }
      `}</style>

      <div className="min-h-screen flex flex-col lg:flex-row">

        {/* ══ LEFT — Animated Splash (desktop only) ══ */}
        <div className="hidden lg:flex lg:w-1/2 gradient-brand flex-col items-center justify-center relative overflow-hidden select-none">

          <div className="blob-a absolute -top-28 -left-28 w-[440px] h-[440px] rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="blob-b absolute -bottom-24 -right-24 w-[400px] h-[400px] rounded-full bg-white/10 blur-3xl pointer-events-none" />

          {SPARKLES.map((s, i) => (
            <div key={i} className="sparkle-el absolute pointer-events-none text-white/60 font-black"
              style={{ top: s.top, left: s.left, fontSize: s.size, animationDuration: `${s.dur}s`, animationDelay: `${s.delay}s` }}>
              ✦
            </div>
          ))}

          {PARTICLES.map((p, i) => (
            <div key={i} className="particle absolute rounded-full bg-white/50 pointer-events-none"
              style={{ width: p.size, height: p.size, left: `${p.left}%`, bottom: "8%", animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s` }} />
          ))}

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="ring-pulse-1 w-[290px] h-[290px] rounded-full border-2 border-white/30" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="ring-pulse-2 w-[400px] h-[400px] rounded-full border border-white/15" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="ring-spin-cw w-[340px] h-[340px] rounded-full" style={{ border: "1.5px dashed rgba(255,255,255,0.22)" }} />
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="ring-spin-ccw w-[460px] h-[460px] rounded-full" style={{ border: "1px dashed rgba(255,255,255,0.1)" }} />
          </div>

          <div className="relative z-10 flex flex-col items-center gap-8">

            {/* Logo + orbit dots */}
            <div className="anim-logo anim-float relative flex items-center justify-center" style={{ width: 260, height: 260 }}>
              <div className="orbit-1 absolute" style={{ width: 260, height: 260 }}>
                <div className="absolute top-0 left-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)]" style={{ marginLeft: -7, marginTop: -7 }} />
              </div>
              <div className="orbit-2 absolute" style={{ width: 260, height: 260 }}>
                <div className="absolute top-0 left-1/2 w-2.5 h-2.5 rounded-full bg-white/75" style={{ marginLeft: -5, marginTop: -5 }} />
              </div>
              <div className="orbit-3 absolute" style={{ width: 260, height: 260 }}>
                <div className="absolute top-0 left-1/2 w-2 h-2 rounded-full bg-white/60" style={{ marginLeft: -4, marginTop: -4 }} />
              </div>
              <div className="anim-glow w-52 h-52 rounded-[2.5rem] bg-white relative overflow-hidden flex items-center justify-center" style={{ border: "0.5px solid rgba(255,255,255,0.6)" }}>
                <img src="/logo-half-2.png" alt="Screen Time Digital" className="w-44 h-44 object-contain" />
                <div className="card-shimmer absolute top-0 bottom-0 w-20 pointer-events-none"
                  style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.45),transparent)", transform: "skewX(-15deg)" }} />
              </div>
            </div>

            <div className="text-center px-6">
              <h2 className="anim-textglow text-[36px] font-extrabold text-white tracking-tight leading-tight">
                {COMPANY.split("").map((ch, i) => (
                  <span key={i} className="anim-letter inline-block" style={{ animationDelay: `${0.85 + i * 0.038}s` }}>
                    {ch === " " ? " " : ch}
                  </span>
                ))}
              </h2>
              <div className="flex justify-center mt-2 mb-2.5">
                <div className="anim-underline h-[3px] rounded-full bg-white/50" style={{ width: 0 }} />
              </div>
              <p className="anim-sub text-white/60 text-sm tracking-[0.18em] font-semibold" style={{ animationDelay: "2.1s" }}>
                By General Electronics
              </p>
            </div>

          </div>
        </div>

        {/* ══ RIGHT — Login Form (full width on mobile, half on desktop) ══ */}
        <div className="w-full lg:w-1/2 min-h-screen flex flex-col bg-slate-50 px-5 py-10 sm:px-10 sm:py-12 lg:px-16 lg:py-0">

          {/* Centred form area */}
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-sm animate-slide-up">

              {/* Mobile brand mark */}
              <div className="lg:hidden flex flex-col items-center mb-8">
                <div className="w-20 h-20 rounded-2xl bg-white border border-slate-100 shadow-md flex items-center justify-center mb-3">
                  <img src="/logo-half-2.png" alt="Logo" className="w-14 h-14 object-contain" />
                </div>
                <p className="text-base font-bold text-slate-800">Screen Time Digital</p>
                <p className="text-xs text-slate-400 mt-0.5 tracking-wide">By General Electronics</p>
              </div>

              {/* Heading */}
              <div className="mb-7">
                <h1 className="text-[22px] font-bold text-slate-900 leading-snug">Welcome back</h1>
                <p className="text-slate-500 text-sm mt-1">Sign in to your account to continue</p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <Input
                      id="email" type="email" placeholder="you@company.com" value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(""); }}
                      className={cn("h-11 pl-10 rounded-xl border-slate-200 bg-white text-sm font-medium placeholder:text-slate-400", isEmailError && "border-red-300 bg-red-50")}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <Input
                      id="password" type={showPwd ? "text" : "password"} placeholder="Enter your password"
                      autoComplete="current-password" value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(""); }}
                      className={cn("h-11 pl-10 pr-12 rounded-xl border-slate-200 bg-white text-sm font-medium placeholder:text-slate-400", isPasswordError && "border-red-300 bg-red-50")}
                      required
                    />
                    <button type="button" onClick={() => setShowPwd(!showPwd)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 transition-colors" tabIndex={-1}>
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-200">
                    <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                    <p className="text-sm text-red-700 font-medium">{error}</p>
                  </div>
                )}

                {devicePending && (
                  <div className="px-4 py-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                      <p className="text-sm font-bold text-amber-800">New Device Detected</p>
                    </div>
                    <p className="text-xs text-amber-700 leading-relaxed">
                      A login request from this device has been sent to your administrator.
                      You will be able to sign in once they approve this device.
                    </p>
                  </div>
                )}

                <Button type="submit"
                  className="w-full h-11 rounded-xl gradient-button text-white font-semibold text-[15px] border-0 hover:opacity-90 active:scale-[0.98] transition-all"
                  disabled={loading}>
                  {loading
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Signing in...</>
                    : <>Sign In <ArrowRight className="h-4 w-4 ml-2" /></>}
                </Button>

              </form>

              <p className="text-center text-xs text-slate-400 mt-7">
                Having trouble? Contact your administrator.
              </p>

            </div>
          </div>

          {/* Branding — pinned to the very bottom */}
          <div className="text-center pb-6 select-none space-y-1">
            <p className="text-sm text-slate-400">
              Powered By{" "}
              <a href="https://billingsphere.com/" target="_blank" rel="noopener noreferrer" className="font-bold text-slate-500 hover:text-slate-700 transition-colors">Billing Sphere</a>
            </p>
            <p className="text-sm text-slate-400">
              Design &amp; Development By{" "}
              <a href="https://fuertedevelopers.com/" target="_blank" rel="noopener noreferrer" className="font-bold text-slate-500 hover:text-slate-700 transition-colors">Fuerte Developers</a>
            </p>
          </div>

        </div>

      </div>
    </>
  );
};

export default LoginPage;

