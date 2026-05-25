import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Zap, Crown, Shield, ArrowRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const SubscriptionPricing = () => {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annually">("monthly");

  const pricingTiers = [
    {
      name: "Basic",
      description: "Perfect for small businesses just getting started.",
      price: billingCycle === "monthly" ? 1499 : 14990,
      period: billingCycle === "monthly" ? "/mo" : "/yr",
      icon: Shield,
      color: "text-blue-500",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-100",
      buttonVariant: "outline",
      popular: false,
      features: [
        "Up to 5 Users",
        "Basic CRM Features",
        "5GB Cloud Storage",
        "Email Support",
        "Standard Reports",
      ],
    },
    {
      name: "Professional",
      description: "Everything you need to scale your growing business.",
      price: billingCycle === "monthly" ? 3999 : 39990,
      period: billingCycle === "monthly" ? "/mo" : "/yr",
      icon: Zap,
      color: "text-emerald-500",
      bgColor: "bg-emerald-50",
      borderColor: "border-primary",
      buttonVariant: "default",
      popular: true,
      features: [
        "Up to 25 Users",
        "Advanced CRM Features",
        "50GB Cloud Storage",
        "24/7 Priority Support",
        "Custom Reports & Analytics",
        "Workflow Automation",
        "API Access",
      ],
    },
    {
      name: "Enterprise",
      description: "Advanced security and control for large organizations.",
      price: billingCycle === "monthly" ? 9999 : 99990,
      period: billingCycle === "monthly" ? "/mo" : "/yr",
      icon: Crown,
      color: "text-amber-500",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-100",
      buttonVariant: "outline",
      popular: false,
      features: [
        "Unlimited Users",
        "All Professional Features",
        "Unlimited Storage",
        "Dedicated Account Manager",
        "White-label Solution",
        "Custom Integrations",
        "On-premise Deployment Option",
      ],
    },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in duration-700 pb-16">
        
        {/* Header & Toggle */}
        <div className="text-center space-y-6 pt-8">
          <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
            Flexible Pricing
          </Badge>
          <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tight">
            Subscription <span className="text-primary">Details</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto font-medium">
            Choose the perfect plan for your needs. Always know what you'll pay with clear, transparent pricing in INR.
          </p>

          <div className="flex items-center justify-center pt-4">
            <div className="bg-muted/50 p-1.5 rounded-2xl inline-flex relative shadow-inner">
              <button
                className={cn(
                  "px-8 py-3 rounded-xl text-sm font-black transition-all duration-300 relative z-10",
                  billingCycle === "monthly" ? "text-foreground shadow-lg shadow-black/5" : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setBillingCycle("monthly")}
              >
                Monthly
              </button>
              <button
                className={cn(
                  "px-8 py-3 rounded-xl text-sm font-black transition-all duration-300 relative z-10",
                  billingCycle === "annually" ? "text-foreground shadow-lg shadow-black/5" : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setBillingCycle("annually")}
              >
                Annually
              </button>
              <div 
                className={cn(
                  "absolute top-1.5 bottom-1.5 w-[50%] bg-background rounded-xl transition-transform duration-300 ease-out shadow-sm border border-border/50",
                  billingCycle === "annually" ? "translate-x-[calc(100%-12px)]" : "translate-x-0"
                )}
              />
            </div>
          </div>
          {billingCycle === "annually" && (
            <p className="text-emerald-500 font-bold text-sm animate-in slide-in-from-top-2">
              Save up to 16% with annual billing!
            </p>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 pt-8 items-start">
          {pricingTiers.map((tier, index) => (
            <Card 
              key={index}
              className={cn(
                "relative border-2 shadow-2xl rounded-[2.5rem] bg-background/60 backdrop-blur-xl overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-primary/10",
                tier.popular ? "shadow-primary/20 border-primary" : "border-transparent hover:border-border",
                tier.popular ? "md:-mt-8 md:mb-8" : ""
              )}
            >
              {tier.popular && (
                <div className="absolute top-0 left-0 right-0 bg-primary text-primary-foreground text-center py-1.5 text-[10px] font-black uppercase tracking-[0.2em]">
                  Most Popular
                </div>
              )}
              <CardContent className={cn("p-8", tier.popular && "pt-12")}>
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className={cn("p-4 rounded-2xl", tier.bgColor, tier.color)}>
                      <tier.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-2xl font-black">{tier.name}</h3>
                  </div>
                  
                  <p className="text-muted-foreground text-sm font-medium h-10">
                    {tier.description}
                  </p>

                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black tracking-tight">
                      ₹{tier.price.toLocaleString('en-IN')}
                    </span>
                    <span className="text-muted-foreground font-bold">
                      {tier.period}
                    </span>
                  </div>

                  <Button 
                    className={cn(
                      "w-full h-12 rounded-xl font-black uppercase tracking-widest text-[11px] gap-2 transition-all",
                      tier.popular ? "shadow-xl shadow-primary/25 hover:scale-[1.02]" : "hover:bg-muted"
                    )}
                    variant={tier.buttonVariant as any}
                  >
                    Select Plan
                    <ArrowRight className="h-4 w-4" />
                  </Button>

                  <div className="space-y-4 pt-6">
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
                      What's included:
                    </p>
                    <ul className="space-y-3">
                      {tier.features.map((feature, fIndex) => (
                        <li key={fIndex} className="flex items-start gap-3">
                          <CheckCircle2 className={cn("h-5 w-5 shrink-0", tier.color)} />
                          <span className="text-sm font-semibold text-slate-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

      </div>
    </DashboardLayout>
  );
};

export default SubscriptionPricing;
