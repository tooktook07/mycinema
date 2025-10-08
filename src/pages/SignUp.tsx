import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Film, Save, Target, Sparkles, Star } from "lucide-react";
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
