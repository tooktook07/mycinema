import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Movie } from "@/data/types";

interface MovieEditDialogProps {
  movie: Movie | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const MovieEditDialog = ({ movie, open, onOpenChange, onSuccess }: MovieEditDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: movie?.title || '',
    year: movie?.year || 2024,
    plot: movie?.plot || '',
    director: movie?.director || '',
    actors: movie?.actors || '',
    runtime: movie?.runtime || '',
    genres: movie?.genre?.join(', ') || '',
    poster: movie?.poster || '',
    imdbId: movie?.imdbId || '',
    rating: movie?.rating || 0,
    imdbRating: movie?.imdbRating || 0,
    metascore: movie?.metascore || 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movie) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('movies')
        .update({
          title: formData.title,
          year: formData.year,
          plot: formData.plot,
          director: formData.director,
          actors: formData.actors,
          runtime: formData.runtime,
          genres: formData.genres.split(',').map(g => g.trim()).filter(Boolean),
          poster: formData.poster,
          imdb_id: formData.imdbId,
          rating: formData.rating,
          imdb_rating: formData.imdbRating,
          metascore: formData.metascore,
          updated_at: new Date().toISOString(),
        })
        .eq('id', movie.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Movie updated successfully",
      });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating movie:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update movie",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Movie</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="plot">Plot</Label>
            <Textarea
              id="plot"
              value={formData.plot}
              onChange={(e) => setFormData({ ...formData, plot: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="director">Director</Label>
              <Input
                id="director"
                value={formData.director}
                onChange={(e) => setFormData({ ...formData, director: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="runtime">Runtime</Label>
              <Input
                id="runtime"
                value={formData.runtime}
                onChange={(e) => setFormData({ ...formData, runtime: e.target.value })}
                placeholder="120 min"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="actors">Actors</Label>
            <Input
              id="actors"
              value={formData.actors}
              onChange={(e) => setFormData({ ...formData, actors: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="genres">Genres (comma separated)</Label>
            <Input
              id="genres"
              value={formData.genres}
              onChange={(e) => setFormData({ ...formData, genres: e.target.value })}
              placeholder="Action, Drama, Thriller"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="poster">Poster URL</Label>
            <Input
              id="poster"
              value={formData.poster}
              onChange={(e) => setFormData({ ...formData, poster: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="imdbId">IMDb ID</Label>
            <Input
              id="imdbId"
              value={formData.imdbId}
              onChange={(e) => setFormData({ ...formData, imdbId: e.target.value })}
              placeholder="tt1234567"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rating">TMDB Rating</Label>
              <Input
                id="rating"
                type="number"
                step="0.1"
                value={formData.rating}
                onChange={(e) => setFormData({ ...formData, rating: parseFloat(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="imdbRating">IMDb Rating</Label>
              <Input
                id="imdbRating"
                type="number"
                step="0.1"
                value={formData.imdbRating}
                onChange={(e) => setFormData({ ...formData, imdbRating: parseFloat(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="metascore">Metascore</Label>
              <Input
                id="metascore"
                type="number"
                value={formData.metascore}
                onChange={(e) => setFormData({ ...formData, metascore: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
