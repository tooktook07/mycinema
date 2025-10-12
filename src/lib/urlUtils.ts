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

// Archive page URLs
export const getGenreUrl = (genre: string): string => {
  return `/genre/${encodeURIComponent(genre)}`;
};

export const getPersonUrl = (name: string): string => {
  return `/person/${encodeURIComponent(name.trim())}`;
};

export const getKeywordUrl = (keyword: string): string => {
  return `/keyword/${encodeURIComponent(keyword)}`;
};

export const getYearUrl = (year: number): string => {
  return `/year/${year}`;
};

export const getCompanyUrl = (company: string): string => {
  return `/company/${encodeURIComponent(company)}`;
};

export const getCountryUrl = (country: string): string => {
  return `/country/${encodeURIComponent(country)}`;
};

export const getLanguageUrl = (language: string): string => {
  return `/language/${encodeURIComponent(language)}`;
};

export const getDecadeUrl = (year: number): string => {
  const decade = Math.floor(year / 10) * 10;
  return `/decade/${decade}s`;
};
