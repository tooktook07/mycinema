/**
 * Utility functions for optimizing image delivery
 */

/**
 * Generates optimized image attributes with responsive srcset
 * Prefers local storage over TMDB CDN when available
 * @param posterUrl - The poster URL (local or TMDB)
 * @param localPosterUrl - Optional local storage URL to prefer
 * @returns Object with src and srcSet for responsive images
 */
export const getOptimizedImageProps = (posterUrl: string, localPosterUrl?: string | null) => {
  // Prefer local storage if available
  const imageUrl = localPosterUrl || posterUrl;
  
  // If it's a TMDB URL with w500, optimize it
  if (imageUrl && imageUrl.includes('image.tmdb.org/t/p/w500/')) {
    const optimizedSrc = imageUrl.replace('/w500/', '/w342/');
    const srcSet = `${optimizedSrc} 1x, ${imageUrl} 2x`;
    return {
      src: optimizedSrc,
      srcSet: srcSet,
      loading: 'lazy' as const,
      decoding: 'async' as const
    };
  }
  
  // For local storage or non-TMDB images, return as-is with lazy loading
  return {
    src: imageUrl,
    loading: 'lazy' as const,
    decoding: 'async' as const
  };
};
