import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCookieConsent } from "@/contexts/CookieConsentContext";
import { Cookie, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const CookieSettings = () => {
  const { hasConsent, acceptCookies, rejectCookies } = useCookieConsent();
  const { toast } = useToast();

  const handleAccept = () => {
    acceptCookies();
    toast({
      title: "Cookies Enabled",
      description: "Analytics tracking has been enabled. We'll use cookies to improve your experience.",
    });
  };

  const handleReject = () => {
    rejectCookies();
    toast({
      title: "Cookies Disabled",
      description: "Analytics tracking has been disabled. Only essential cookies will be used.",
      variant: "destructive",
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Cookie className="h-5 w-5" />
          <CardTitle>Cookie Preferences</CardTitle>
        </div>
        <CardDescription>
          Manage your tracking and analytics preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Status */}
        <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
          <div className="space-y-1">
            <div className="font-medium">Current Status</div>
            <div className="text-sm text-muted-foreground">
              {hasConsent === null && "No preference set"}
              {hasConsent === true && "Analytics cookies enabled"}
              {hasConsent === false && "Analytics cookies disabled"}
            </div>
          </div>
          <div>
            {hasConsent === true && (
              <CheckCircle className="h-6 w-6 text-green-500" />
            )}
            {hasConsent === false && (
              <XCircle className="h-6 w-6 text-destructive" />
            )}
            {hasConsent === null && (
              <Cookie className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Cookie Types */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">Essential Cookies</h4>
            <p className="text-sm text-muted-foreground">
              Required for the website to function properly. These cannot be disabled.
            </p>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-muted-foreground">Always enabled</span>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Analytics Cookies</h4>
            <p className="text-sm text-muted-foreground">
              Help us understand how visitors interact with our website by collecting anonymous information. We use Google Analytics 4.
            </p>
            <div className="flex items-center gap-2 text-sm">
              {hasConsent ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-green-500">Enabled</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span className="text-destructive">Disabled</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          {hasConsent ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full sm:w-auto">
                  Disable Analytics
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Disable Analytics Cookies?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will stop tracking your browsing behavior and disable Google Analytics. You can re-enable this at any time.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleReject}>
                    Disable
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button onClick={handleAccept} className="w-full sm:w-auto">
              Enable Analytics
            </Button>
          )}
        </div>

        {/* Additional Info */}
        <div className="text-xs text-muted-foreground pt-4 border-t">
          <p>
            We respect your privacy. Analytics data is anonymized and used solely to improve our service. 
            For more information, see our Privacy Policy.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
