import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Film } from "lucide-react";
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
  const {
    signIn,
    signUp,
    user
  } = useAuth();
  const {
    toast
  } = useToast();
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
          variant: "destructive"
        });
        return;
      }
    }
    setIsLoading(true);
    const {
      error
    } = await signIn(signInEmail, signInPassword);
    setIsLoading(false);
    if (error) {
      toast({
        title: "Error signing in",
        description: error.message,
        variant: "destructive"
      });
    } else {
      // Check for guest ratings to migrate
      const guestCount = getGuestRatedCount();
      if (guestCount > 0) {
        toast({
          title: "Welcome back!",
          description: "Migrating your guest ratings..."
        });
        // Wait a moment for auth to settle, then migrate
        setTimeout(async () => {
          const result = await migrateGuestRatingsToUser(user?.id || "");
          if (result.success && result.count > 0) {
            toast({
              title: "✨ Ratings Saved!",
              description: `Your ${result.count} guest ratings have been saved to your account.`
            });
          }
          navigate("/wizard");
        }, 500);
      } else {
        toast({
          title: "Welcome back!",
          description: "You have successfully signed in."
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
          variant: "destructive"
        });
        return;
      }
    }
    setIsLoading(true);
    const {
      error
    } = await signUp(signUpEmail, signUpPassword);
    setIsLoading(false);
    if (error) {
      if (error.message.includes("already registered")) {
        toast({
          title: "Account already exists",
          description: "Please sign in instead.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error creating account",
          description: error.message,
          variant: "destructive"
        });
      }
    } else {
      // Check for guest ratings to migrate
      const guestCount = getGuestRatedCount();
      if (guestCount > 0) {
        toast({
          title: "Account created!",
          description: "Migrating your guest ratings..."
        });
        // Wait for auth to settle, then migrate
        setTimeout(async () => {
          const result = await migrateGuestRatingsToUser(user?.id || "");
          if (result.success && result.count > 0) {
            toast({
              title: "✨ Welcome to My Cinema!",
              description: `Your ${result.count} guest ratings have been saved to your account.`
            });
          }
          navigate("/wizard");
        }, 500);
      } else {
        toast({
          title: "Account created!",
          description: "Welcome to My Cinema!"
        });
        navigate("/");
      }
    }
  };
  return <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Film className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-3xl">Welcome to My Cinema</CardTitle>
          <CardDescription>Sign in to rate movies and access features</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input id="signup-email" type="email" placeholder="your@email.com" value={signUpEmail} onChange={e => setSignUpEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input id="signup-password" type="password" placeholder="••••••••" value={signUpPassword} onChange={e => setSignUpPassword(e.target.value)} required />
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
    </div>;
};
export default Auth;