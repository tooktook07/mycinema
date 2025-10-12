// Generate URL-safe slug from movie title and year
export const createMovieSlug = (title: string, year: number): string => {
  const cleanTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-')          // Replace spaces with hyphens
    .replace(/-+/g, '-')           // Remove consecutive hyphens
    .trim();
  
  return `${cleanTitle}-${year}`;
};

// Parse slug back to title pattern and year for lookup
export const parseMovieSlug = (slug: string): { titlePattern: string, year: number } | null => {
  const match = slug.match(/^(.+)-(\d{4})$/);
  if (!match) return null;
  
  const [, titleSlug, yearStr] = match;
  const titlePattern = titleSlug.replace(/-/g, ' ');
  const year = parseInt(yearStr, 10);
  
  return { titlePattern, year };
};

// Generate full movie URL
export const getMovieUrl = (title: string, year: number): string => {
  return `/movie/${createMovieSlug(title, year)}`;
};

// Genre and person URLs (for future use)
export const getGenreUrl = (genre: string): string => {
  return `/genre/${encodeURIComponent(genre)}`;
};

export const getPersonUrl = (name: string): string => {
  return `/person/${encodeURIComponent(name)}`;
};
