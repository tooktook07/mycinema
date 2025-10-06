import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Film, Save, Target, Sparkles, Globe, TrendingUp, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { migrateGuestRatingsToUser, getGuestRatedCount } from "@/lib/guestRatings";

const emailSchema = z.string().email("Invalid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

const Auth = () => {
  const navigate = useNavigate();
  const { signIn, signUp, user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(signInEmail);
      passwordSchema.parse(signInPassword);
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
    const { error } = await signIn(signInEmail, signInPassword);
    setIsLoading(false);

    if (error) {
      toast({
        title: "Error signing in",
        description: error.message,
        variant: "destructive",
      });
    } else {
      // Check for guest ratings to migrate
      const guestCount = getGuestRatedCount();
      if (guestCount > 0) {
        toast({
          title: "Welcome back!",
          description: "Migrating your guest ratings...",
        });
        // Wait a moment for auth to settle, then migrate
        setTimeout(async () => {
          const result = await migrateGuestRatingsToUser(user?.id || "");
          if (result.success && result.count > 0) {
            toast({
              title: "✨ Ratings Saved!",
              description: `Your ${result.count} guest ratings have been saved to your account.`,
            });
          }
          navigate("/wizard");
        }, 500);
      } else {
        toast({
          title: "Welcome back!",
          description: "You have successfully signed in.",
        });
        navigate("/");
      }
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(signUpEmail);
      passwordSchema.parse(signUpPassword);
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
    const { error } = await signUp(signUpEmail, signUpPassword);
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
          navigate("/wizard");
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
                    <h3 className="text-base mb-1">Movie Wizard</h3>
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

          {/* Auth Forms Section */}
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Get Started</CardTitle>
              <CardDescription>Sign in or create your account</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="signin" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>
                
                <TabsContent value="signin">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email</Label>
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="your@email.com"
                        value={signInEmail}
                        onChange={(e) => setSignInEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signin-password">Password</Label>
                      <Input
                        id="signin-password"
                        type="password"
                        placeholder="••••••••"
                        value={signInPassword}
                        onChange={(e) => setSignInPassword(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "Signing in..." : "Sign In"}
                    </Button>
                  </form>
                </TabsContent>
                
                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="your@email.com"
                        value={signUpEmail}
                        onChange={(e) => setSignUpEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        value={signUpPassword}
                        onChange={(e) => setSignUpPassword(e.target.value)}
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
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Auth;
