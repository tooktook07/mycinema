import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { DevModeProvider } from "@/contexts/DevModeContext";
import { DevModeSwitcher } from "@/components/DevModeSwitcher";
import { MovieDetailModal } from "@/components/MovieDetailModal";
import Index from "./pages/Index";
import Movies from "./pages/Movies";
import Account from "./pages/Account";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Wizard from "./pages/Wizard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const location = useLocation();
  const background = location.state?.backgroundLocation;

  return (
    <>
      <Navigation />
      <Routes location={background || location}>
        <Route path="/" element={<Index />} />
        <Route path="/movies" element={<Movies />} />
        <Route path="/wizard" element={<Wizard />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/account" element={<Account />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/movie/:id" element={<MovieDetailModal />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      
      {/* Modal route - only renders when background exists */}
      {background && (
        <Routes>
          <Route path="/movie/:id" element={<MovieDetailModal />} />
        </Routes>
      )}
      
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
              <AppRoutes />
            </BrowserRouter>
          </DevModeProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
