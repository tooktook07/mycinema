import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEffectiveAuth } from '@/contexts/DevModeContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Heart, ThumbsDown, Star, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTheme } from '@/components/ThemeProvider';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { getGuestRatings, clearGuestRatings } from '@/lib/guestRatings';

interface RatedItem {
  id: string;
  title: string;
  poster: string | null;
  user_rating: number;
  media_type: string;
  updated_at: string;
}

export default function Profile() {
  const { user } = useEffectiveAuth();
  const navigate = useNavigate();
  const isGuest = !user;
  const [ratedMovies, setRatedMovies] = useState<RatedItem[]>([]);
  const [ratedTvShows, setRatedTvShows] = useState<RatedItem[]>([]);
  const [guestRatings, setGuestRatings] = useState<RatedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { theme, setTheme } = useTheme();
  const [showClearDialog, setShowClearDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchRatedItems = async () => {
      try {
        if (isGuest) {
          // Fetch guest ratings from localStorage
          const guestRatingsData = getGuestRatings();
          
          if (guestRatingsData.length > 0) {
            // Fetch movie details from database for each rated movie
            const movieIds = guestRatingsData.map(r => r.movieId);
            
            const { data: moviesData } = await supabase
              .from('movies')
              .select('id, title, poster')
              .in('id', movieIds);
            
            const ratingsWithDetails = guestRatingsData.map(rating => {
              const movie = moviesData?.find(m => m.id === rating.movieId);
              return {
                id: rating.movieId,
                title: movie?.title || 'Unknown',
                poster: movie?.poster || null,
                user_rating: rating.rating,
                media_type: 'movie',
                updated_at: rating.timestamp,
              };
            }).sort((a, b) => 
              new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            );
            
            setGuestRatings(ratingsWithDetails);
          }
        } else {
          // Fetch rated movies
          const { data: movieRatings } = await supabase
            .from('user_ratings')
            .select(`
              id,
              user_rating,
              media_type,
              updated_at,
              movies (
                title,
                poster
              )
            `)
            .eq('user_id', user.id)
            .eq('media_type', 'movie')
            .not('user_rating', 'is', null)
            .order('updated_at', { ascending: false });

          // Fetch rated TV shows
          const { data: tvRatings } = await supabase
            .from('user_ratings')
            .select(`
              id,
              user_rating,
              media_type,
              updated_at,
              tv_shows (
                title,
                poster
              )
            `)
            .eq('user_id', user.id)
            .eq('media_type', 'tv_show')
            .not('user_rating', 'is', null)
            .order('updated_at', { ascending: false });

          const movies = movieRatings?.map(rating => ({
            id: rating.id,
            title: (rating as any).movies?.title || 'Unknown',
            poster: (rating as any).movies?.poster || null,
            user_rating: rating.user_rating || 0,
            media_type: rating.media_type,
            updated_at: rating.updated_at,
          })) || [];

          const tvShows = tvRatings?.map(rating => ({
            id: rating.id,
            title: (rating as any).tv_shows?.title || 'Unknown',
            poster: (rating as any).tv_shows?.poster || null,
            user_rating: rating.user_rating || 0,
            media_type: rating.media_type,
            updated_at: rating.updated_at,
          })) || [];

          setRatedMovies(movies);
          setRatedTvShows(tvShows);
        }
      } catch (error) {
        console.error('Error fetching rated items:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRatedItems();
  }, [user, isGuest]);

  const handleClearGuestData = () => {
    clearGuestRatings();
    setGuestRatings([]);
    setShowClearDialog(false);
    toast({
      title: "Data cleared",
      description: "All your guest ratings have been removed.",
    });
  };

  const getRatingBadge = (rating: number) => {
    if (rating === 1) {
      return <Badge variant="destructive" className="gap-1"><ThumbsDown className="h-3 w-3" /> Not for me</Badge>;
    } else if (rating === 5) {
      return <Badge variant="secondary" className="gap-1"><Star className="h-3 w-3" /> I liked this</Badge>;
    } else if (rating === 10) {
      return <Badge variant="default" className="gap-1"><Heart className="h-3 w-3 fill-current" /> Love this!</Badge>;
    }
    return null;
  };

  const RatedItemsList = ({ items }: { items: RatedItem[] }) => (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <Card key={item.id}>
          <CardContent className="p-4">
            <div className="flex gap-3">
              {item.poster ? (
                <img
                  src={item.poster}
                  alt={item.title}
                  className="w-16 h-24 object-cover rounded"
                />
              ) : (
                <div className="w-16 h-24 bg-muted rounded flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">No image</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">{item.title}</h3>
                <div className="mt-2">
                  {getRatingBadge(item.user_rating)}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Rated {new Date(item.updated_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="container mx-auto max-w-7xl py-8 px-4">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl py-8 px-4">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-3xl font-bold">
          {isGuest ? 'Guest Profile' : 'My Profile'}
        </h1>
        {isGuest && (
          <Badge variant="secondary">🎭 Guest Mode</Badge>
        )}
      </div>

      <div className="grid gap-6">
        {/* Theme Preference Card - Same for both guest and authenticated */}
        <Card>
          <CardHeader>
            <CardTitle>Theme Preference</CardTitle>
            <CardDescription>Choose your preferred color scheme</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="profile-theme">Default Theme</Label>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger id="profile-theme" className="w-full max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Rated Items Card */}
        <Card>
          <CardHeader>
            <CardTitle>
              {isGuest ? 'My Guest Ratings' : 'My Rated Items'}
            </CardTitle>
            <CardDescription>
              {isGuest 
                ? 'View all your guest session ratings' 
                : 'View all your rated movies and TV shows'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isGuest ? (
              // Guest ratings display
              <>
                {guestRatings.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    You haven't rated any movies yet. Try the Movie Wizard to get started!
                  </p>
                ) : (
                  <RatedItemsList items={guestRatings} />
                )}
              </>
            ) : (
              // Authenticated user tabs (existing logic)
              <Tabs defaultValue="movies">
                <TabsList>
                  <TabsTrigger value="movies">Movies ({ratedMovies.length})</TabsTrigger>
                  <TabsTrigger value="tv">TV Shows ({ratedTvShows.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="movies" className="mt-4">
                  {ratedMovies.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      You haven't rated any movies yet
                    </p>
                  ) : (
                    <RatedItemsList items={ratedMovies} />
                  )}
                </TabsContent>
                <TabsContent value="tv" className="mt-4">
                  {ratedTvShows.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      You haven't rated any TV shows yet
                    </p>
                  ) : (
                    <RatedItemsList items={ratedTvShows} />
                  )}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>

        {/* Danger Zone - Guest Only */}
        {isGuest && guestRatings.length > 0 && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>
                Irreversible actions that will permanently delete your data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Clear All Guest Data</p>
                  <p className="text-sm text-muted-foreground">
                    This will permanently delete all {guestRatings.length} guest ratings from your browser
                  </p>
                </div>
                <Button 
                  variant="destructive" 
                  onClick={() => setShowClearDialog(true)}
                >
                  Clear Data
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all {guestRatings.length} guest ratings stored in your browser.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleClearGuestData}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, clear all data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
