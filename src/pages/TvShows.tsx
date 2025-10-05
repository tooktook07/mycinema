import { Tv } from "lucide-react";

const TvShows = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10">
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Tv className="h-24 w-24 text-primary/50 mb-6" />
          <h1 className="text-4xl font-bold text-foreground mb-4">TV Shows Coming Soon</h1>
          <p className="text-lg text-muted-foreground max-w-md">
            We're working on bringing you an amazing TV shows experience. Stay tuned!
          </p>
        </div>
      </div>
    </div>
  );
};

export default TvShows;
