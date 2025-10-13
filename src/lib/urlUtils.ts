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

// Helper to convert text to URL-safe slug (lowercase with dashes)
const toUrlSlug = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')      // Replace spaces with dashes
    .replace(/[^\w-]/g, '');   // Remove non-word chars except dashes
};

// Helper to convert URL slug back to searchable text
const fromUrlSlug = (slug: string): string => {
  return slug.replace(/-/g, ' ');
};

// Helper to capitalize first letter of each word for display
export const toTitleCase = (text: string): string => {
  return text
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Archive page URLs
export const getGenreUrl = (genre: string): string => {
  return `/genre/${toUrlSlug(genre)}`;
};

export const getPersonUrl = (name: string): string => {
  return `/person/${toUrlSlug(name.trim())}`;
};

export const getKeywordUrl = (keyword: string): string => {
  return `/keyword/${toUrlSlug(keyword)}`;
};

export const getYearUrl = (year: number): string => {
  return `/year/${year}`;
};

export const getCompanyUrl = (company: string): string => {
  return `/company/${toUrlSlug(company)}`;
};

export const getCountryUrl = (country: string): string => {
  return `/country/${toUrlSlug(country)}`;
};

export const getLanguageUrl = (language: string): string => {
  return `/language/${toUrlSlug(language)}`;
};

export const getDecadeUrl = (year: number): string => {
  const decade = Math.floor(year / 10) * 10;
  return `/decade/${decade}s`;
};

// Decode URL slugs back to original text for database queries
export const decodeArchiveSlug = (slug: string): string => {
  return fromUrlSlug(decodeURIComponent(slug));
};
