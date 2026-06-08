import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2, Zap, Crown, Shield, ArrowRight, Gift,
  Search, MessageCircle, X, Send, Bot
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { itemService } from "@/api/services/item.service";

interface ChatMessage {
  from: "user" | "bot";
  text: string;
}

const BOT_RESPONSES: Record<string, string> = {
  default: "Thanks for reaching out! Our team will get back to you shortly. You can also email us at support@crmfuerte.com.",
  price: "Our plans start completely free! Paid plans start from ₹1,499/mo. Would you like to know more about a specific plan?",
  free: "Yes! Our Free plan is forever free — no credit card required. It includes up to 2 users, core CRM features, and 1GB storage.",
  upgrade: "You can upgrade anytime from this page by selecting a plan and clicking 'Select Plan'. Need help choosing? Just ask!",
  feature: "Every paid plan includes core CRM features. Higher tiers add automation, analytics, custom integrations, and dedicated support.",
  support: "We offer email support on all plans, priority support on Professional, and a dedicated account manager on Enterprise.",
};

function getAutoReply(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("price") || lower.includes("cost") || lower.includes("how much")) return BOT_RESPONSES.price;
  if (lower.includes("free")) return BOT_RESPONSES.free;
  if (lower.includes("upgrade") || lower.includes("switch")) return BOT_RESPONSES.upgrade;
  if (lower.includes("feature") || lower.includes("include")) return BOT_RESPONSES.feature;
  if (lower.includes("support") || lower.includes("help")) return BOT_RESPONSES.support;
  return BOT_RESPONSES.default;
}

const SubscriptionPricing = () => {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annually">("monthly");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { from: "bot", text: "👋 Hi there! Ask me anything about our pricing plans or features. I'm here to help!" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const sendMessage = () => {
    const trimmed = chatInput.trim();
    if (!trimmed) return;
    const userMsg: ChatMessage = { from: "user", text: trimmed };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setTimeout(() => {
      setChatMessages(prev => [...prev, { from: "bot", text: getAutoReply(trimmed) }]);
    }, 700);
  };

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["items"],
    queryFn: () => itemService.getAll(),
  });

  // Free plan — always present
  const freePlan = {
    id: "free",
    name: "Free",
    description: "Get started at no cost. No credit card required.",
    price: 0,
    period: billingCycle === "monthly" ? "/mo" : "/yr",
    icon: Gift,
    color: "text-violet-500",
    bgColor: "bg-violet-50 dark:bg-violet-950/30",
    borderColor: "border-violet-200",
    buttonVariant: "outline",
    popular: false,
    badge: "Forever Free",
    features: [
      "Up to 2 Users",
      "Core CRM Features",
      "1GB Cloud Storage",
      "Community Support",
      "Basic Reports",
    ],
  };

  let dynamicPlans = items.map((item: any, index: number) => {
    const icons = [Shield, Zap, Crown];
    const colors = ["text-blue-500", "text-emerald-500", "text-amber-500"];
    const bgColors = ["bg-blue-50 dark:bg-blue-950/30", "bg-emerald-50 dark:bg-emerald-950/30", "bg-amber-50 dark:bg-amber-950/30"];
    const i = index % 3;
    const features = item.long_description
      ? item.long_description.split("\n").filter((f: string) => f.trim() !== "")
      : ["Basic CRM Features", "Email Support"];
    return {
      id: item._id,
      name: item.description,
      description: item.group || "Subscription Plan",
      price: billingCycle === "monthly" ? item.rate : item.rate * 12 * 0.84,
      period: billingCycle === "monthly" ? "/mo" : "/yr",
      icon: icons[i],
      color: colors[i],
      bgColor: bgColors[i],
      buttonVariant: i === 1 ? "default" : "outline",
      popular: i === 1,
      features,
    };
  });

  const fallbackPlans = [
    {
      id: "basic",
      name: "Basic",
      description: "Perfect for small businesses just getting started.",
      price: billingCycle === "monthly" ? 1499 : 14990,
      period: billingCycle === "monthly" ? "/mo" : "/yr",
      icon: Shield,
      color: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
      buttonVariant: "outline",
      popular: false,
      features: ["Up to 5 Users", "Basic CRM Features", "5GB Cloud Storage", "Email Support", "Standard Reports"],
    },
    {
      id: "professional",
      name: "Professional",
      description: "Everything you need to scale your growing business.",
      price: billingCycle === "monthly" ? 3999 : 39990,
      period: billingCycle === "monthly" ? "/mo" : "/yr",
      icon: Zap,
      color: "text-emerald-500",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
      buttonVariant: "default",
      popular: true,
      features: ["Up to 25 Users", "Advanced CRM Features", "50GB Cloud Storage", "24/7 Priority Support", "Custom Reports & Analytics", "Workflow Automation", "API Access"],
    },
    {
      id: "enterprise",
      name: "Enterprise",
      description: "Advanced security and control for large organizations.",
      price: billingCycle === "monthly" ? 9999 : 99990,
      period: billingCycle === "monthly" ? "/mo" : "/yr",
      icon: Crown,
      color: "text-amber-500",
      bgColor: "bg-amber-50 dark:bg-amber-950/30",
      buttonVariant: "outline",
      popular: false,
      features: ["Unlimited Users", "All Professional Features", "Unlimited Storage", "Dedicated Account Manager", "White-label Solution", "Custom Integrations", "On-premise Deployment"],
    },
  ];

  const paidPlans = dynamicPlans.length > 0 ? dynamicPlans : fallbackPlans;
  const allPlans = [freePlan, ...paidPlans];

  // Filter plans by search
  const filteredPlans = allPlans.filter(plan => {
    const q = searchQuery.toLowerCase();
    return (
      plan.name.toLowerCase().includes(q) ||
      plan.description.toLowerCase().includes(q) ||
      plan.features.some((f: string) => f.toLowerCase().includes(q))
    );
  });

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in duration-700 pb-16">

        {/* Header */}
        <div className="text-center space-y-6 pt-8">
          <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
            Flexible Pricing
          </Badge>
          <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tight">
            Subscription <span className="text-primary">Details</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto font-medium">
            Choose the perfect plan. Start free — upgrade when you're ready.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center pt-4">
            <div className="bg-muted/50 p-1.5 rounded-2xl inline-flex relative shadow-inner">
              <button
                className={cn("px-8 py-3 rounded-xl text-sm font-black transition-all duration-300 relative z-10",
                  billingCycle === "monthly" ? "text-foreground shadow-lg shadow-black/5" : "text-muted-foreground hover:text-foreground")}
                onClick={() => setBillingCycle("monthly")}
              >Monthly</button>
              <button
                className={cn("px-8 py-3 rounded-xl text-sm font-black transition-all duration-300 relative z-10",
                  billingCycle === "annually" ? "text-foreground shadow-lg shadow-black/5" : "text-muted-foreground hover:text-foreground")}
                onClick={() => setBillingCycle("annually")}
              >Annually</button>
              <div className={cn(
                "absolute top-1.5 bottom-1.5 w-[50%] bg-background rounded-xl transition-transform duration-300 ease-out shadow-sm border border-border/50",
                billingCycle === "annually" ? "translate-x-[calc(100%-12px)]" : "translate-x-0"
              )} />
            </div>
          </div>
          {billingCycle === "annually" && (
            <p className="text-emerald-500 font-bold text-sm animate-in slide-in-from-top-2">Save up to 16% with annual billing!</p>
          )}

          {/* Search Bar */}
          <div className="relative max-w-md mx-auto mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search plans or features..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background rounded-xl h-11 text-sm"
            />
          </div>
        </div>

        {/* Pricing Cards */}
        {isLoading ? (
          <div className="text-center text-muted-foreground font-bold py-12 animate-pulse">Loading plans...</div>
        ) : filteredPlans.length === 0 ? (
          <div className="text-center text-muted-foreground py-16">
            <Search className="h-10 w-10 mx-auto mb-4 opacity-30" />
            <p className="font-semibold">No plans match your search.</p>
            <Button variant="ghost" className="mt-2 text-sm" onClick={() => setSearchQuery("")}>Clear Search</Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 pt-8 items-stretch">
            {filteredPlans.map((tier: any) => (
              <Card
                key={tier.id}
                onClick={() => setSelectedPlan(tier.name)}
                className={cn(
                  "relative border-2 shadow-xl rounded-3xl bg-card overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl cursor-pointer flex flex-col",
                  selectedPlan === tier.name
                    ? "border-primary ring-4 ring-primary/20 bg-primary/5 z-10"
                    : tier.popular
                      ? "border-primary shadow-primary/20"
                      : "border-border/60 hover:border-border"
                )}
              >
                {/* Top ribbon */}
                {(tier.popular || tier.badge) && (
                  <div className={cn(
                    "text-white text-center py-2 text-[10px] font-black uppercase tracking-[0.2em]",
                    tier.badge ? "bg-violet-600" : "bg-primary"
                  )}>
                    {tier.badge ?? "Most Popular"}
                  </div>
                )}

                <CardContent className="p-6 flex flex-col flex-1">
                  {/* Icon + Name */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={cn("p-3 rounded-2xl shrink-0", tier.bgColor, tier.color)}>
                      <tier.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black leading-tight">{tier.name}</h3>
                      {selectedPlan === tier.name && (
                        <span className="text-[10px] font-bold text-primary uppercase tracking-wider">✓ Selected</span>
                      )}
                    </div>
                  </div>

                  {/* Description — fixed height */}
                  <p className="text-muted-foreground text-xs font-medium h-10 leading-relaxed mb-4">
                    {tier.description}
                  </p>

                  {/* Price */}
                  <div className="flex items-baseline gap-1 mb-5">
                    <span className="text-4xl font-black tracking-tight">
                      {tier.price === 0 ? "₹0" : `₹${tier.price.toLocaleString("en-IN")}`}
                    </span>
                    <span className="text-muted-foreground text-sm font-semibold">{tier.period}</span>
                  </div>

                  {/* CTA Button */}
                  <Button
                    className={cn(
                      "w-full h-11 rounded-xl font-black uppercase tracking-widest text-[10px] gap-2 transition-all mb-5",
                      selectedPlan === tier.name ? "shadow-xl shadow-primary/25" :
                      tier.popular ? "shadow-lg shadow-primary/20 hover:scale-[1.02]" : ""
                    )}
                    variant={selectedPlan === tier.name ? "default" : (tier.buttonVariant as any)}
                    onClick={(e) => { e.stopPropagation(); setSelectedPlan(tier.name); }}
                  >
                    {selectedPlan === tier.name ? (
                      <><CheckCircle2 className="h-4 w-4" /> Selected Plan</>
                    ) : tier.price === 0 ? (
                      <>Get Started Free <ArrowRight className="h-4 w-4" /></>
                    ) : (
                      <>Select Plan <ArrowRight className="h-4 w-4" /></>
                    )}
                  </Button>

                  {/* Divider */}
                  <div className="border-t border-border/50 mb-4" />

                  {/* Features — grows to fill remaining card height */}
                  <div className="flex-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground mb-3">
                      What's included:
                    </p>
                    <ul className="space-y-2.5">
                      {tier.features.map((feature: string, fIndex: number) => (
                        <li key={fIndex} className="flex items-start gap-2">
                          <CheckCircle2 className={cn("h-4 w-4 shrink-0 mt-0.5", tier.color)} />
                          <span className="text-xs font-medium text-foreground/80 leading-snug">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Chat Widget */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {chatOpen && (
          <div className="w-80 bg-background border border-border rounded-2xl shadow-2xl shadow-black/20 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300">
            {/* Chat header */}
            <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                <div>
                  <p className="text-sm font-bold">CRM Support</p>
                  <p className="text-[10px] opacity-80">Typically replies instantly</p>
                </div>
              </div>
              <button onClick={() => setChatOpen(false)} className="opacity-80 hover:opacity-100 transition-opacity">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto max-h-64 p-3 space-y-3 bg-muted/20">
              {chatMessages.map((msg, i) => (
                <div key={i} className={cn("flex", msg.from === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[80%] px-3 py-2 rounded-2xl text-xs font-medium leading-relaxed",
                    msg.from === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-background border border-border text-foreground rounded-bl-sm shadow-sm"
                  )}>
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-3 py-3 border-t border-border bg-background flex items-center gap-2">
              <Input
                className="text-xs h-9 rounded-xl flex-1"
                placeholder="Type a message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              />
              <Button size="icon" className="h-9 w-9 rounded-xl shrink-0" onClick={sendMessage}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Toggle button */}
        <button
          onClick={() => setChatOpen(prev => !prev)}
          className={cn(
            "h-14 w-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300",
            chatOpen ? "bg-destructive hover:bg-destructive/90" : "bg-primary hover:bg-primary/90"
          )}
        >
          {chatOpen
            ? <X className="h-6 w-6 text-white" />
            : <MessageCircle className="h-6 w-6 text-white" />
          }
        </button>
      </div>
    </DashboardLayout>
  );
};

export default SubscriptionPricing;
