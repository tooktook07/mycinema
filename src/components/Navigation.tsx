import { Film, Home, Settings, LogIn, LogOut, User, Sparkles, Bookmark, HelpCircle, Menu } from "lucide-react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
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
export const Navigation = () => {
  const { user, isAdmin, signOut } = useEffectiveAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isDiscoverPage = location.pathname === '/discover';

  return (
    <nav className={cn(
      "h-12 z-50",
      isDiscoverPage 
        ? "fixed top-0 left-0 right-0 bg-gradient-to-b from-black/90 via-black/50 to-transparent border-none"
        : "sticky top-0 border-b bg-background"
    )}>
      <div className={cn(
        "container mx-auto px-4",
        isDiscoverPage ? "max-w-md" : "max-w-7xl"
      )}>
        <div className="flex items-center justify-between h-12">
          <NavLink to="/" className={cn(
            "flex items-center hover:opacity-80 transition-opacity",
            isDiscoverPage && "text-white"
          )}>
            <Film className="h-5 w-5" />
          </NavLink>
          
          <div className="flex items-center gap-1">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                cn(
                  "flex items-center p-2 rounded transition-colors",
                  isDiscoverPage
                    ? isActive
                      ? "bg-white/20 text-white"
                      : "text-white/70 hover:text-white"
                    : isActive
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                )
              }
              title="Home"
            >
              <Home className="h-4 w-4" />
            </NavLink>
            
            <NavLink
              to="/discover"
              className={({ isActive }) =>
                cn(
                  "flex items-center p-2 rounded transition-colors",
                  isDiscoverPage
                    ? isActive
                      ? "bg-white/20 text-white"
                      : "text-white/70 hover:text-white"
                    : isActive
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                )
              }
              title="Discover"
            >
              <Sparkles className="h-4 w-4" />
            </NavLink>

            <NavLink
              to="/movies"
              className={({ isActive }) =>
                cn(
                  "flex items-center p-2 rounded transition-colors",
                  isDiscoverPage
                    ? isActive
                      ? "bg-white/20 text-white"
                      : "text-white/70 hover:text-white"
                    : isActive
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                )
              }
              title="Movies"
            >
              <Film className="h-4 w-4" />
            </NavLink>

            <NavLink
              to="/watchlist"
              className={({ isActive }) =>
                cn(
                  "flex items-center p-2 rounded transition-colors",
                  isDiscoverPage
                    ? isActive
                      ? "bg-white/20 text-white"
                      : "text-white/70 hover:text-white"
                    : isActive
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                )
              }
              title="Watchlist"
            >
              <Bookmark className="h-4 w-4" />
            </NavLink>
            
            {isAdmin && (
              <NavLink
                to="/account"
                className={({ isActive }) =>
                  cn(
                    "flex items-center p-2 rounded transition-colors",
                    isDiscoverPage
                      ? isActive
                        ? "bg-white/20 text-white"
                        : "text-white/70 hover:text-white"
                      : isActive
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground"
                  )
                }
                title="Admin"
              >
                <Settings className="h-4 w-4" />
              </NavLink>
            )}

            <div className={cn(
              "ml-1 pl-1 flex items-center gap-1",
              isDiscoverPage ? "border-l border-white/20" : "border-l"
            )}>
              <ThemeToggle />
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-8 w-8",
                        isDiscoverPage && "text-white hover:bg-white/20"
                      )}
                      title="Account Menu"
                    >
                      <User className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/profile')}>
                      <User className="h-4 w-4 mr-2" />
                      View Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/help')}>
                      <HelpCircle className="h-4 w-4 mr-2" />
                      Help
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-8 w-8",
                        isDiscoverPage && "text-white hover:bg-white/20"
                      )}
                      title="Menu"
                    >
                      <Menu className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate('/profile')}>
                      <User className="h-4 w-4 mr-2" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/help')}>
                      <HelpCircle className="h-4 w-4 mr-2" />
                      Help
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/login')}>
                      <LogIn className="h-4 w-4 mr-2" />
                      Sign In
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};
