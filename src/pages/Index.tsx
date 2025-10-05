import { Film, Tv } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10">
      {/* Hero Section */}
      <div className="border-b border-border/50 bg-gradient-to-r from-primary/20 via-background to-primary/20 px-4 py-16">
        <div className="container mx-auto max-w-7xl">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Film className="h-12 w-12 text-accent" />
            <h1 className="text-5xl font-bold text-foreground md:text-6xl">CineMatch</h1>
          </div>
          <p className="text-center text-xl text-muted-foreground max-w-3xl mx-auto mb-12">
            Your ultimate destination for discovering movies and TV shows. Browse, filter, and find your next binge-worthy content.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center max-w-2xl mx-auto">
            <Button
              size="lg"
              className="w-full sm:w-auto text-lg px-8 py-6"
              onClick={() => navigate("/movies")}
            >
              <Film className="h-5 w-5 mr-2" />
              Browse Movies
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto text-lg px-8 py-6"
              onClick={() => navigate("/tv-shows")}
            >
              <Tv className="h-5 w-5 mr-2" />
              Browse TV Shows
            </Button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto max-w-7xl px-4 py-16">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="text-center p-6 rounded-lg bg-card/50 border border-border">
            <div className="flex justify-center mb-4">
              <Film className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">8 Movies</h3>
            <p className="text-muted-foreground">
              Curated collection of top-rated films across all genres
            </p>
          </div>
          <div className="text-center p-6 rounded-lg bg-card/50 border border-border">
            <div className="flex justify-center mb-4">
              <Tv className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">4 TV Shows</h3>
            <p className="text-muted-foreground">
              Complete series information with seasons and episode counts
            </p>
          </div>
          <div className="text-center p-6 rounded-lg bg-card/50 border border-border">
            <div className="flex justify-center mb-4">
              <svg className="h-12 w-12 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Advanced Filters</h3>
            <p className="text-muted-foreground">
              Filter by genre, rating, year, and more to find exactly what you want
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
