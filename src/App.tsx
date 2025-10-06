import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { DevModeProvider } from "@/contexts/DevModeContext";
import { DevModeSwitcher } from "@/components/DevModeSwitcher";
import Index from "./pages/Index";
import Movies from "./pages/Movies";
import TvShows from "./pages/TvShows";
import Account from "./pages/Account";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Wizard from "./pages/Wizard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" storageKey="cinematch-theme">
      <TooltipProvider>
        <AuthProvider>
          <DevModeProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Navigation />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/movies" element={<Movies />} />
                <Route path="/tv-shows" element={<TvShows />} />
                <Route path="/wizard" element={<Wizard />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/account" element={<Account />} />
                <Route path="/profile" element={<Profile />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              {/* DevMode Floating Button */}
              {import.meta.env.DEV && (
                <div className="fixed bottom-4 right-4 z-50">
                  <DevModeSwitcher />
                </div>
              )}
            </BrowserRouter>
          </DevModeProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
