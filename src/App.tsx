import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Navigation } from "@/components/Navigation";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { DevModeProvider } from "@/contexts/DevModeContext";
import { FilterProvider } from "@/contexts/FilterContext";
import { AccessibilityProvider } from "@/contexts/AccessibilityContext";
import { DevModeSwitcher } from "@/components/DevModeSwitcher";
import { AccessibilityWidget } from "@/components/AccessibilityWidget";
import { ReadingGuide } from "@/components/accessibility/ReadingGuide";
import { usePageTracking } from "@/hooks/usePageTracking";
import Index from "./pages/Index";
import Movies from "./pages/Movies";
import Account from "./pages/Account";
import SignUp from "./pages/SignUp";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import DiscoverMode from "./pages/DiscoverMode";
import Watchlist from "./pages/Watchlist";
import Help from "./pages/Help";
import NotFound from "./pages/NotFound";
import MovieDetail from "./pages/MovieDetail";
import GenreArchive from "./pages/GenreArchive";
import PersonArchive from "./pages/PersonArchive";
import KeywordArchive from "./pages/KeywordArchive";
import YearArchive from "./pages/YearArchive";
import LanguageArchive from "./pages/LanguageArchive";
import CompanyArchive from "./pages/CompanyArchive";
import CountryArchive from "./pages/CountryArchive";
import StreamingArchive from "./pages/StreamingArchive";
import ReactGA from "react-ga4";

const queryClient = new QueryClient();

// Initialize Google Analytics 4
try {
  ReactGA.initialize('G-7MCMFEBTTZ', {
    gaOptions: {
      send_page_view: false,
      cookie_domain: 'auto',
      cookie_flags: 'SameSite=None;Secure'
    }
  });
  console.log('GA4 initialized successfully with react-ga4');
} catch (error) {
  console.error('GA4 initialization error:', error);
}

const AppRoutes = () => {
  usePageTracking();
  
  return (
    <>
      <Navigation />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/movies" element={<Movies />} />
        <Route path="/movie/:slug" element={<MovieDetail />} />
        <Route path="/genre/:genreName" element={<GenreArchive />} />
        <Route path="/person/:personName" element={<PersonArchive />} />
        <Route path="/keyword/:keyword" element={<KeywordArchive />} />
        <Route path="/year/:year" element={<YearArchive />} />
        <Route path="/language/:language" element={<LanguageArchive />} />
        <Route path="/company/:company" element={<CompanyArchive />} />
        <Route path="/country/:country" element={<CountryArchive />} />
        <Route path="/streaming/:provider" element={<StreamingArchive />} />
        <Route path="/discover" element={<DiscoverMode />} />
        <Route path="/watchlist" element={<Watchlist />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/login" element={<Login />} />
        <Route path="/auth" element={<Login />} /> {/* Redirect old /auth to /login */}
        <Route path="/account" element={<Account />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/help" element={<Help />} /> {/* Help documentation - no nav link */}
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      
      
      {/* DevMode Floating Button */}
      {import.meta.env.DEV && (
        <div className="fixed bottom-20 right-4 z-50">
          <DevModeSwitcher />
        </div>
      )}

      {/* Accessibility Widget & Reading Guide */}
      <AccessibilityWidget />
      <ReadingGuide />

      {/* Colorblind SVG Filters */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden="true">
        <defs>
          <filter id="protanopia-filter">
            <feColorMatrix type="matrix" values="0.567, 0.433, 0, 0, 0
                                                   0.558, 0.442, 0, 0, 0
                                                   0, 0.242, 0.758, 0, 0
                                                   0, 0, 0, 1, 0"/>
          </filter>
          <filter id="deuteranopia-filter">
            <feColorMatrix type="matrix" values="0.625, 0.375, 0, 0, 0
                                                   0.7, 0.3, 0, 0, 0
                                                   0, 0.3, 0.7, 0, 0
                                                   0, 0, 0, 1, 0"/>
          </filter>
          <filter id="tritanopia-filter">
            <feColorMatrix type="matrix" values="0.95, 0.05, 0, 0, 0
                                                   0, 0.433, 0.567, 0, 0
                                                   0, 0.475, 0.525, 0, 0
                                                   0, 0, 0, 1, 0"/>
          </filter>
        </defs>
      </svg>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <ThemeProvider defaultTheme="dark" storageKey="cinematch-theme">
        <TooltipProvider>
          <AuthProvider>
            <DevModeProvider>
              <AccessibilityProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <FilterProvider>
                    <AppRoutes />
                  </FilterProvider>
                </BrowserRouter>
              </AccessibilityProvider>
            </DevModeProvider>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
