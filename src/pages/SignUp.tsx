import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Film, Save, Target, Sparkles, Star } from "lucide-react";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { migrateGuestRatingsToUser, getGuestRatedCount } from "@/lib/guestRatings";

const emailSchema = z.string().email("Invalid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

const SignUp = () => {
  const navigate = useNavigate();
  const { signUp, user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
        return;
      }
    }

    setIsLoading(true);
    const { error } = await signUp(email, password);
    setIsLoading(false);

    if (error) {
      if (error.message.includes("already registered")) {
        toast({
          title: "Account already exists",
          description: "Please sign in instead.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error creating account",
          description: error.message,
          variant: "destructive",
        });
      }
    } else {
      // Check for guest ratings to migrate
      const guestCount = getGuestRatedCount();
      if (guestCount > 0) {
        toast({
          title: "Account created!",
          description: "Migrating your guest ratings...",
        });
        // Wait for auth to settle, then migrate
        setTimeout(async () => {
          const result = await migrateGuestRatingsToUser(user?.id || "");
          if (result.success && result.count > 0) {
            toast({
              title: "✨ Welcome to My Cinema!",
              description: `Your ${result.count} guest ratings have been saved to your account.`,
            });
          }
          navigate("/discover");
        }, 500);
      } else {
        toast({
          title: "Account created!",
          description: "Welcome to My Cinema!",
        });
        navigate("/");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10 flex items-center justify-center p-4">
      <div className="container mx-auto max-w-6xl">
        {/* Hero Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <Film className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-1">Welcome to My Cinema</h1>
          <p className="text-muted-foreground">Discover your next favorite movie</p>
        </div>

        {/* Two Column Layout */}
        <div className="grid md:grid-cols-2 gap-8 items-start">
          {/* Benefits Section */}
          <div className="space-y-4">
            <div className="grid gap-3">
              <div className="rounded-lg border bg-card p-4 transition-all hover:shadow-md hover:border-primary/50">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Save className="h-5 w-5 text-foreground" />
                  </div>
                  <div>
                    <h3 className="text-base mb-1">Save Your Ratings</h3>
                    <p className="text-sm text-muted-foreground">Keep your movie preferences synced across all your devices</p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border bg-card p-4 transition-all hover:shadow-md hover:border-primary/50">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Target className="h-5 w-5 text-foreground" />
                  </div>
                  <div>
                    <h3 className="text-base mb-1">Smart Recommendations</h3>
                    <p className="text-sm text-muted-foreground">AI-powered suggestions tailored to your unique taste</p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border bg-card p-4 transition-all hover:shadow-md hover:border-primary/50">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-foreground" />
                  </div>
                  <div>
                    <h3 className="text-base mb-1">Discover Mode</h3>
                    <p className="text-sm text-muted-foreground">Discover your perfect matches with our quick rating flow</p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border bg-card p-4 transition-all hover:shadow-md hover:border-primary/50">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Star className="h-5 w-5 text-foreground" />
                  </div>
                  <div>
                    <h3 className="text-base mb-1">Track Everything</h3>
                    <p className="text-sm text-muted-foreground">See your ratings, stats, and movie journey in one place</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sign Up Form Section */}
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Create Your Account</CardTitle>
              <CardDescription>Start your movie journey today</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Password must be at least 6 characters
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Creating account..." : "Create Account"}
                </Button>
              </form>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">או</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={async () => {
                  await lovable.auth.signInWithOAuth("google", {
                    redirect_uri: window.location.origin,
                  });
                }}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Sign up with Google
              </Button>
              
              <div className="mt-4 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="text-primary hover:underline font-medium">
                  Log in
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
