import { useState, useEffect } from "react";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  checkWatchlistLimit,
  addToWatchlist,
  removeFromWatchlist,
  isInWatchlist,
} from "@/lib/watchlistService";
import { WatchlistLoginDialog } from "./WatchlistLoginDialog";
import { WatchlistUpgradeDialog } from "./WatchlistUpgradeDialog";
import { logActivity } from "@/lib/activityLogger";

interface MovieWatchlistProps {
  movieId: string;
  movieTitle: string;
  iconOnly?: boolean;
  preloadedInWatchlist?: boolean;
}

export const MovieWatchlist = ({ movieId, movieTitle, iconOnly = false, preloadedInWatchlist }: MovieWatchlistProps) => {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);

  // Check if movie is in watchlist (skip if preloaded data available)
  const { data: inWatchlist = false, refetch } = useQuery({
    queryKey: ['watchlist', movieId, user?.id],
    queryFn: () => user?.id ? isInWatchlist(user.id, movieId) : Promise.resolve(false),
    enabled: !!user?.id && preloadedInWatchlist === undefined,
    initialData: preloadedInWatchlist,
  });

  // Add to watchlist mutation
  const addMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      const result = await addToWatchlist(user.id, movieId);
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      refetch();
      toast({
        title: "Added to watchlist",
        description: `${movieTitle} has been added to your watchlist.`,
      });
      
      if (user?.id) {
        logActivity(user.id, 'watchlist_added', { movie_id: movieId, movie_title: movieTitle });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Remove from watchlist mutation
  const removeMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      await removeFromWatchlist(user.id, movieId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      refetch();
      toast({
        title: "Removed from watchlist",
        description: `${movieTitle} has been removed from your watchlist.`,
      });
      
      if (user?.id) {
        logActivity(user.id, 'watchlist_removed', { movie_id: movieId, movie_title: movieTitle });
      }
    },
  });

  const handleClick = async () => {
    // Guest users - show login dialog
    if (!user) {
      setLoginDialogOpen(true);
      return;
    }

    // If already in watchlist, remove it
    if (inWatchlist) {
      removeMutation.mutate();
      return;
    }

    // Check limit before adding
    try {
      const limitCheck = await checkWatchlistLimit(user.id);
      
      if (!limitCheck.canAdd) {
        setUpgradeDialogOpen(true);
        return;
      }

      // Add to watchlist
      addMutation.mutate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to check watchlist limit",
        variant: "destructive",
      });
    }
  };

  const isLoading = addMutation.isPending || removeMutation.isPending;

  if (iconOnly) {
    return (
      <>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={handleClick}
          disabled={isLoading}
        >
          <Bookmark className={`h-4 w-4 ${inWatchlist ? 'fill-current' : ''}`} />
        </Button>
        <WatchlistLoginDialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen} />
        <WatchlistUpgradeDialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen} />
      </>
    );
  }

  return (
    <>
      <Button
        variant={inWatchlist ? "default" : "outline"}
        onClick={handleClick}
        disabled={isLoading}
      >
        <Bookmark className={`h-4 w-4 mr-2 ${inWatchlist ? 'fill-current' : ''}`} />
        {inWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
      </Button>
      <WatchlistLoginDialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen} />
      <WatchlistUpgradeDialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen} />
    </>
  );
};
