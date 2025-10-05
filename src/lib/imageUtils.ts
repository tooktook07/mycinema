/**
 * Utility functions for optimizing image delivery
 */

/**
 * Generates optimized TMDB image attributes with responsive srcset
 * Changes w500 to w342 for better match with display size (~280px)
 * @param posterUrl - The original poster URL from TMDB
 * @returns Object with src and srcSet for responsive images
 */
export const getOptimizedImageProps = (posterUrl: string) => {
  // If it's a TMDB URL with w500, optimize it
  if (posterUrl && posterUrl.includes('image.tmdb.org/t/p/w500/')) {
    const optimizedSrc = posterUrl.replace('/w500/', '/w342/');
    const srcSet = `${optimizedSrc} 1x, ${posterUrl} 2x`;
    return {
      src: optimizedSrc,
      srcSet: srcSet,
      loading: 'lazy' as const,
      decoding: 'async' as const
    };
  }
  
  // For non-TMDB images or different sizes, return as-is with lazy loading
  return {
    src: posterUrl,
    loading: 'lazy' as const,
    decoding: 'async' as const
  };
};
