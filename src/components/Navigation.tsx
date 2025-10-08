import { Film, Home, Settings, LogIn, LogOut, User, Sparkles, Bookmark } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
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
import { DiscoverModeModal } from "@/components/DiscoverModeModal";

export const Navigation = () => {
  const { user, isAdmin, signOut } = useEffectiveAuth();
  const navigate = useNavigate();
  const [discoverModeOpen, setDiscoverModeOpen] = useState(false);

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

            {user && (
              <NavLink
                to="/watchlist"
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded text-sm transition-colors",
                    isActive
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  )
                }
              >
                <Bookmark className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Watchlist</span>
              </NavLink>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDiscoverModeOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-sm text-muted-foreground hover:text-foreground"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Discover</span>
            </Button>
            
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
                <>
                  <NavLink to="/profile">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-1.5 px-2.5 py-1.5"
                    >
                      <User className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Profile</span>
                    </Button>
                  </NavLink>
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
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <DiscoverModeModal open={discoverModeOpen} onOpenChange={setDiscoverModeOpen} />
    </nav>
  );
};
