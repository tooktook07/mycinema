import { Download, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const Account = () => {
  const { toast } = useToast();
  const [isImporting, setIsImporting] = useState(false);

  const handleImportMovies = async () => {
    setIsImporting(true);
    try {
      toast({
        title: "Importing movies...",
        description: "Fetching 2025 movies from TMDB. This may take a moment.",
      });

      const { data, error } = await supabase.functions.invoke('import-tmdb-movies');

      if (error) throw error;

      toast({
        title: "Import Complete!",
        description: data.message || `Found ${data.totalFound} movies, imported ${data.imported}.`,
      });
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import movies",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10">
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Settings className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold text-foreground">Account Settings</h1>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Data Management</CardTitle>
              <CardDescription>Import and manage movie data from external sources</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">Import 2025 Movies</h3>
                <p className="text-sm text-muted-foreground">
                  Fetch all movies from 2025 with rating 6.9 or above from TMDB database
                </p>
                <Button
                  onClick={handleImportMovies}
                  disabled={isImporting}
                  className="w-full sm:w-auto"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isImporting ? "Importing..." : "Import Movies"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>About CineMatch</CardTitle>
              <CardDescription>Your movie and TV show companion</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                CineMatch helps you discover and track your favorite movies and TV shows. Browse our collection, 
                filter by your preferences, and keep track of what you've watched.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Account;
