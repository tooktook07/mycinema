import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Film, Calendar, Tag, Database, Image } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface MovieStats {
  totalMovies: number;
  withOmdb: number;
  withPosters: number;
  totalWatchlistSaves: number;
  avgUserRating: number;
  byGenre: { genre: string; count: number }[];
  byYear: { year: number; count: number }[];
}

interface MovieStatsCardProps {
  stats: MovieStats | null;
  loading: boolean;
}

export const MovieStatsCard = ({ stats, loading }: MovieStatsCardProps) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Movie Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  const omdbPercentage = stats.totalMovies > 0 
    ? ((stats.withOmdb / stats.totalMovies) * 100).toFixed(1)
    : '0';

  const postersPercentage = stats.totalMovies > 0
    ? ((stats.withPosters / stats.totalMovies) * 100).toFixed(1)
    : '0';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Movie Statistics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Film className="h-4 w-4" />
              <span>Total Movies</span>
            </div>
            <div className="text-2xl font-bold">{stats.totalMovies}</div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Database className="h-4 w-4" />
              <span>With OMDb</span>
            </div>
            <div className="text-2xl font-bold">
              {stats.withOmdb}
              <span className="text-sm text-muted-foreground ml-2">
                ({omdbPercentage}%)
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Image className="h-4 w-4" />
              <span>With Posters</span>
            </div>
            <div className="text-2xl font-bold">
              {stats.withPosters}
              <span className="text-sm text-muted-foreground ml-2">
                ({postersPercentage}%)
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-muted-foreground text-sm">Watchlist Saves</div>
            <div className="text-2xl font-bold">{stats.totalWatchlistSaves}</div>
          </div>

          <div className="space-y-1">
            <div className="text-muted-foreground text-sm">Avg User Rating</div>
            <div className="text-2xl font-bold">
              {stats.avgUserRating > 0 ? stats.avgUserRating.toFixed(1) : 'N/A'}
            </div>
          </div>
        </div>

        {/* Top Genres */}
        {stats.byGenre.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Tag className="h-4 w-4" />
              <span>Top Genres</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {stats.byGenre.slice(0, 8).map((item) => (
                <div key={item.genre} className="flex justify-between items-center p-2 bg-muted rounded-md text-sm">
                  <span className="truncate">{item.genre}</span>
                  <span className="font-semibold ml-2">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Movies by Decade */}
        {stats.byYear.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="h-4 w-4" />
              <span>Movies by Decade</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {(() => {
                const byDecade: { [key: string]: number } = {};
                stats.byYear.forEach(item => {
                  const decade = Math.floor(item.year / 10) * 10;
                  byDecade[decade] = (byDecade[decade] || 0) + item.count;
                });
                return Object.entries(byDecade)
                  .sort((a, b) => parseInt(b[0]) - parseInt(a[0]))
                  .slice(0, 10)
                  .map(([decade, count]) => (
                    <div key={decade} className="flex justify-between items-center p-2 bg-muted rounded-md text-sm">
                      <span>{decade}s</span>
                      <span className="font-semibold">{count}</span>
                    </div>
                  ));
              })()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
