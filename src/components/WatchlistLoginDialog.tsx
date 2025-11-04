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
      <DialogContent className="sm:max-w-lg border-primary/20">
        <DialogHeader className="space-y-3">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 backdrop-blur-md flex items-center justify-center">
            <Bookmark className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-2xl text-center">Save Your Favorites</DialogTitle>
          <DialogDescription className="text-base text-center">
            Create a free account to unlock your personal watchlist and personalized recommendations!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
            <div className="rounded-full bg-primary/10 p-2 mt-0.5">
              <Bookmark className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">Save Movies</h4>
              <p className="text-xs text-muted-foreground">
                Keep track of movies you want to watch
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
            <div className="rounded-full bg-primary/10 p-2 mt-0.5">
              <Star className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">Rate & Review</h4>
              <p className="text-xs text-muted-foreground">
                Share your opinions on movies you've watched
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
            <div className="rounded-full bg-primary/10 p-2 mt-0.5">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">Personalized Recommendations</h4>
              <p className="text-xs text-muted-foreground">
                Get movie suggestions based on your taste
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
            <div className="rounded-full bg-primary/10 p-2 mt-0.5">
              <Heart className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">Sync Across Devices</h4>
              <p className="text-xs text-muted-foreground">
                Access your watchlist anywhere, anytime
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={handleSignUp} size="lg" className="w-full font-semibold">
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
