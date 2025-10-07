import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Infinity, Zap, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface WatchlistUpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const WatchlistUpgradeDialog = ({ open, onOpenChange }: WatchlistUpgradeDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Crown className="h-6 w-6 text-primary" />
            <DialogTitle className="text-2xl">Upgrade to Pro</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            You've reached your watchlist limit (10/10 movies). Upgrade to Pro for unlimited access!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 p-4 border border-primary/20">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold">Pro Plan</h3>
              <Badge variant="default" className="gap-1">
                <Crown className="h-3 w-3" />
                Premium
              </Badge>
            </div>
            <div className="text-3xl font-bold mb-1">Coming Soon</div>
            <p className="text-sm text-muted-foreground">Full access to all Pro features</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-primary/10 p-2 mt-0.5">
                <Infinity className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold">Unlimited Watchlist</h4>
                <p className="text-sm text-muted-foreground">
                  Save as many movies as you want
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="rounded-full bg-primary/10 p-2 mt-0.5">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold">Advanced Features</h4>
                <p className="text-sm text-muted-foreground">
                  Access to premium filters and recommendations
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="rounded-full bg-primary/10 p-2 mt-0.5">
                <Star className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold">Early Access</h4>
                <p className="text-sm text-muted-foreground">
                  Be the first to try new features
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Button disabled size="lg" className="w-full">
            <Crown className="h-4 w-4 mr-2" />
            Upgrade to Pro (Coming Soon)
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Continue with Free Plan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
