import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { DevModeProvider } from "@/contexts/DevModeContext";
import { FilterProvider } from "@/contexts/FilterContext";
import { DevModeSwitcher } from "@/components/DevModeSwitcher";
import Index from "./pages/Index";
import Movies from "./pages/Movies";
import Account from "./pages/Account";
import Auth from "./pages/Auth";
import SignUp from "./pages/SignUp";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import DiscoverMode from "./pages/DiscoverMode";
import Watchlist from "./pages/Watchlist";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppRoutes = () => {
  return (
    <>
      <Navigation />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/movies" element={<Movies />} />
        <Route path="/discover" element={<DiscoverMode />} />
        <Route path="/watchlist" element={<Watchlist />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/login" element={<Login />} />
        <Route path="/auth" element={<Login />} /> {/* Redirect old /auth to /login */}
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
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" storageKey="cinematch-theme">
      <TooltipProvider>
        <AuthProvider>
          <DevModeProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <FilterProvider>
                <AppRoutes />
              </FilterProvider>
            </BrowserRouter>
          </DevModeProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
