import { MovieSEOData } from '../types';

export const generateMovieSchema = (movie: MovieSEOData) => {
  const schema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'Movie',
    name: movie.title,
    datePublished: movie.releaseDate || `${movie.year}-01-01`,
  };

  if (movie.poster) {
    schema.image = movie.poster;
  }

  if (movie.plot) {
    schema.description = movie.plot;
  }

  if (movie.genres && movie.genres.length > 0) {
    schema.genre = movie.genres;
  }

  if (movie.director) {
    const directors = movie.director.split(',').map(d => d.trim());
    schema.director = directors.map(name => ({
      '@type': 'Person',
      name,
    }));
  }

  if (movie.actors) {
    const actorsList = movie.actors.split(',').map(a => a.trim()).slice(0, 5);
    schema.actor = actorsList.map(name => ({
      '@type': 'Person',
      name,
    }));
  }

  if (movie.runtime) {
    // Convert "142 min" to ISO 8601 duration "PT142M"
    const minutes = movie.runtime.replace(/\D/g, '');
    if (minutes) {
      schema.duration = `PT${minutes}M`;
    }
  }

  // Use IMDb rating if available, otherwise use TMDB rating
  const ratingValue = movie.imdbRating || movie.rating;
  const ratingCount = movie.imdbVotes || movie.voteCount;

  if (ratingValue && ratingCount) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: ratingValue.toFixed(1),
      bestRating: '10',
      ratingCount: ratingCount.toString(),
    };
  }

  if (movie.imdbId) {
    schema.sameAs = `https://www.imdb.com/title/${movie.imdbId}/`;
  }

  return schema;
};
