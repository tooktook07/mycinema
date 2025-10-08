import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Bookmark, Star, Heart, TrendingUp } from "lucide-react";

interface WatchlistLoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const WatchlistLoginDialog = ({ open, onOpenChange }: WatchlistLoginDialogProps) => {
  const navigate = useNavigate();

  const handleSignUp = () => {
    onOpenChange(false);
    navigate('/signup');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">Save Your Favorites</DialogTitle>
          <DialogDescription className="text-base">
            Create an account to unlock your personal watchlist and more!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <Bookmark className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold">Save Movies</h4>
              <p className="text-sm text-muted-foreground">
                Keep track of movies you want to watch
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <Star className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold">Rate & Review</h4>
              <p className="text-sm text-muted-foreground">
                Share your opinions on movies you've watched
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold">Personalized Recommendations</h4>
              <p className="text-sm text-muted-foreground">
                Get movie suggestions based on your taste
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <Heart className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold">Sync Across Devices</h4>
              <p className="text-sm text-muted-foreground">
                Access your watchlist anywhere, anytime
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={handleSignUp} size="lg" className="w-full">
            Create Free Account
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
