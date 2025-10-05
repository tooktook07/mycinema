import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEffectiveAuth } from '@/contexts/DevModeContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Heart, ThumbsDown, Star } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTheme } from '@/components/ThemeProvider';

interface RatedItem {
  id: string;
  title: string;
  poster: string | null;
  sentiment_rating: number;
  media_type: string;
  updated_at: string;
}

export default function Profile() {
  const { user } = useEffectiveAuth();
  const navigate = useNavigate();
  const [ratedMovies, setRatedMovies] = useState<RatedItem[]>([]);
  const [ratedTvShows, setRatedTvShows] = useState<RatedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const fetchRatedItems = async () => {
      try {
        // Fetch rated movies
        const { data: movieRatings } = await supabase
          .from('user_ratings')
          .select(`
            id,
            sentiment_rating,
            media_type,
            updated_at,
            movies (
              title,
              poster
            )
          `)
          .eq('user_id', user.id)
          .eq('media_type', 'movie')
          .not('sentiment_rating', 'is', null)
          .order('updated_at', { ascending: false });

        // Fetch rated TV shows
        const { data: tvRatings } = await supabase
          .from('user_ratings')
          .select(`
            id,
            sentiment_rating,
            media_type,
            updated_at,
            tv_shows (
              title,
              poster
            )
          `)
          .eq('user_id', user.id)
          .eq('media_type', 'tv_show')
          .not('sentiment_rating', 'is', null)
          .order('updated_at', { ascending: false });

        const movies = movieRatings?.map(rating => ({
          id: rating.id,
          title: (rating as any).movies?.title || 'Unknown',
          poster: (rating as any).movies?.poster || null,
          sentiment_rating: rating.sentiment_rating || 0,
          media_type: rating.media_type,
          updated_at: rating.updated_at,
        })) || [];

        const tvShows = tvRatings?.map(rating => ({
          id: rating.id,
          title: (rating as any).tv_shows?.title || 'Unknown',
          poster: (rating as any).tv_shows?.poster || null,
          sentiment_rating: rating.sentiment_rating || 0,
          media_type: rating.media_type,
          updated_at: rating.updated_at,
        })) || [];

        setRatedMovies(movies);
        setRatedTvShows(tvShows);
      } catch (error) {
        console.error('Error fetching rated items:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRatedItems();
  }, [user, navigate]);

  const getRatingBadge = (rating: number) => {
    if (rating === 1) {
      return <Badge variant="destructive" className="gap-1"><ThumbsDown className="h-3 w-3" /> Not Interested</Badge>;
    } else if (rating === 5) {
      return <Badge variant="secondary" className="gap-1"><Star className="h-3 w-3" /> Like</Badge>;
    } else if (rating === 10) {
      return <Badge variant="default" className="gap-1"><Heart className="h-3 w-3 fill-current" /> Love</Badge>;
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
                  {getRatingBadge(item.sentiment_rating)}
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
      <h1 className="text-3xl font-bold mb-6">My Profile</h1>

      <div className="grid gap-6">
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

        <Card>
          <CardHeader>
            <CardTitle>My Rated Items</CardTitle>
            <CardDescription>View all your rated movies and TV shows</CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
