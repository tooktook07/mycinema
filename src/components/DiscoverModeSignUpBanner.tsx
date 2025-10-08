import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Sparkles, Database, TrendingUp, RefreshCw } from "lucide-react";

export const WizardSignUpBanner = () => {
  const navigate = useNavigate();

  return (
    <Alert className="bg-primary/5 border-primary/20 mb-8">
      <Sparkles className="h-5 w-5 text-primary" />
      <AlertTitle className="text-lg font-semibold mb-3">
        Sign up to unlock the full experience!
      </AlertTitle>
      <AlertDescription>
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-start gap-2">
              <Database className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
              <span>Save your ratings permanently</span>
            </div>
            <div className="flex items-start gap-2">
              <TrendingUp className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
              <span>Get better personalized recommendations</span>
            </div>
            <div className="flex items-start gap-2">
              <RefreshCw className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
              <span>Sync across all your devices</span>
            </div>
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
              <span>Track your movie journey over time</span>
            </div>
          </div>
          
          <div className="flex gap-2 mt-4">
            <Button 
              onClick={() => navigate("/signup")} 
              size="sm"
              className="font-semibold"
            >
              Sign Up Free
            </Button>
            <Button 
              onClick={() => navigate("/login")} 
              variant="outline" 
              size="sm"
            >
              Sign In
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
};
