import { Film, Home, Tv, Settings, LogIn, LogOut, User } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useEffectiveAuth } from "@/contexts/DevModeContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DevModeSwitcher } from "@/components/DevModeSwitcher";

export const Navigation = () => {
  const { user, isAdmin, signOut } = useEffectiveAuth();
  const navigate = useNavigate();

  return (
    <nav className="border-b bg-background sticky top-0 z-50">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="flex items-center justify-between h-12">
          <NavLink to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Film className="h-4 w-4" />
            <span className="text-sm font-semibold">My Cinema</span>
          </NavLink>
          
          <div className="flex items-center gap-1">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded text-sm transition-colors",
                  isActive
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              <Home className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Home</span>
            </NavLink>
            
            <NavLink
              to="/movies"
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded text-sm transition-colors",
                  isActive
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              <Film className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Movies</span>
            </NavLink>
            
            <NavLink
              to="/tv-shows"
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded text-sm transition-colors",
                  isActive
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              <Tv className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">TV Shows</span>
            </NavLink>
            
            {isAdmin && (
              <NavLink
                to="/account"
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded text-sm transition-colors",
                    isActive
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  )
                }
              >
                <Settings className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Admin</span>
              </NavLink>
            )}

            <div className="ml-1 pl-1 border-l flex items-center gap-1">
              {import.meta.env.DEV && <DevModeSwitcher />}
              <ThemeToggle />
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-1.5 px-2.5 py-1.5"
                    >
                      <User className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Profile</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/profile')}>
                      <User className="h-4 w-4 mr-2" />
                      View Profile
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <NavLink to="/auth">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-1.5 px-2.5 py-1.5"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Sign In</span>
                  </Button>
                </NavLink>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};
