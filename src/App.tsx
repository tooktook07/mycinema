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
import { CookieConsentProvider } from "@/contexts/CookieConsentContext";
import { DevModeSwitcher } from "@/components/DevModeSwitcher";
import { AccessibilityWidget } from "@/components/AccessibilityWidget";
import { ReadingGuide } from "@/components/accessibility/ReadingGuide";
import { CookieConsent } from "@/components/CookieConsent";
import { usePageTracking } from "@/hooks/usePageTracking";
import { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";
import ReactGA from "react-ga4";

// Lazy-loaded route components for code splitting
const Index = lazy(() => import("./pages/Index"));
const Movies = lazy(() => import("./pages/Movies"));
const Account = lazy(() => import("./pages/Account"));
const SignUp = lazy(() => import("./pages/SignUp"));
const Login = lazy(() => import("./pages/Login"));
const Profile = lazy(() => import("./pages/Profile"));
const DiscoverMode = lazy(() => import("./pages/DiscoverMode"));
const Watchlist = lazy(() => import("./pages/Watchlist"));
const Help = lazy(() => import("./pages/Help"));
const NotFound = lazy(() => import("./pages/NotFound"));
const MovieDetail = lazy(() => import("./pages/MovieDetail"));
const GenreArchive = lazy(() => import("./pages/GenreArchive"));
const PersonArchive = lazy(() => import("./pages/PersonArchive"));
const KeywordArchive = lazy(() => import("./pages/KeywordArchive"));
const YearArchive = lazy(() => import("./pages/YearArchive"));
const LanguageArchive = lazy(() => import("./pages/LanguageArchive"));
const CompanyArchive = lazy(() => import("./pages/CompanyArchive"));
const CountryArchive = lazy(() => import("./pages/CountryArchive"));
const StreamingArchive = lazy(() => import("./pages/StreamingArchive"));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - prevents redundant refetches
      gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
      refetchOnWindowFocus: false,
    },
  },
});

// GA4 will be initialized after user consent
export const initializeGA4 = () => {
  try {
    ReactGA.initialize('G-7MCMFEBTTZ', {
      gaOptions: {
        send_page_view: false,
        cookie_domain: 'auto',
        // Use SameSite=Lax for non-HTTPS (better Firefox compatibility)
        cookie_flags: window.location.protocol === 'https:' ? 'SameSite=None;Secure' : 'SameSite=Lax'
      },
      gtagOptions: {
        debug_mode: import.meta.env.DEV,
      }
    });
    console.log('GA4 initialized successfully after consent');
  } catch (error) {
    console.error('GA4 initialization error:', error);
  }
};

const AppRoutes = () => {
  usePageTracking();
  
  return (
    <>
      <Navigation />
      <Suspense fallback={<PageLoader />}>
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
        <Route path="/account" element={<Account />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/help" element={<Help />} /> {/* Help documentation - no nav link */}
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
      
      
      {/* DevMode Floating Button */}
      {import.meta.env.DEV && (
        <div className="fixed bottom-20 right-4 z-50">
          <DevModeSwitcher />
        </div>
      )}

      {/* Cookie Consent Banner */}
      <CookieConsent />

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
          <CookieConsentProvider>
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
          </CookieConsentProvider>
        </TooltipProvider>
      </ThemeProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
