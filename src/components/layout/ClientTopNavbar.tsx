import { NavLink } from "@/components/NavLink";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, Settings, HelpCircle, Mic } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "@/api/services/auth.service";
import { usePermissionContext } from "@/context/PermissionContext";

const clientNavLinks = [
  { title: "Knowledge Base", url: "/knowledge-base" },
  { title: "Projects", url: "/projects" },
  { title: "Invoices", url: "/invoices" },
  { title: "Contracts", url: "/contracts" },
  { title: "Estimates", url: "/estimates" },
  { title: "Proposals", url: "/proposals" },
  { title: "Support", url: "/support" },
];

export function ClientTopNavbar() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { logout } = usePermissionContext();
 
  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header className="customer-navbar sticky top-0 z-50 w-full border-b backdrop-blur transition-colors duration-300">
      <div className="container flex h-16 items-center justify-between mx-auto px-4 md:px-6">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <NavLink to="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              C
            </div>
            <span className="text-xl font-bold tracking-tight hidden sm:inline-block">
              CRM<span className="text-primary">Pro</span>
            </span>
          </NavLink>
        </div>

        {/* Navigation Links - Centered on Desktop */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {clientNavLinks.map((link) => (
            <NavLink
              key={link.url}
              to={link.url}
              className="transition-opacity hover:opacity-80"
              activeClassName="font-bold border-b-2 pb-1 opacity-100"
            >
              {link.title}
            </NavLink>
          ))}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          <div className="relative hidden lg:block group">
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-64 rounded-md border border-input bg-transparent pl-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 outline-none group">
                <Avatar className="h-8 w-8 ring-2 ring-transparent group-hover:ring-primary/30 transition-all">
                  <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-xs">
                    CL
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="flex items-center gap-2 p-2 px-3 mb-1">
                <div className="flex flex-col space-y-0.5">
                  <p className="text-sm font-medium">Client User</p>
                  <p className="text-xs text-muted-foreground">client@example.com</p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/profile")}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/knowledge-base")}>
                <HelpCircle className="mr-2 h-4 w-4" />
                Help Center
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
