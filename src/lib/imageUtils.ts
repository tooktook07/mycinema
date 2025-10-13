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
  
  // If it's a TMDB URL, optimize with responsive srcset
  if (imageUrl && imageUrl.includes('image.tmdb.org/t/p/')) {
    // Extract the file path from the URL
    const pathMatch = imageUrl.match(/\/t\/p\/w\d+\/(.+)$/);
    
    if (pathMatch && pathMatch[1]) {
      const fileName = pathMatch[1];
      const baseUrl = 'https://image.tmdb.org/t/p';
      
      // For display width of ~292px:
      // - Use w342 as base (good for 1x displays)
      // - Use w500 for 2x displays (retina)
      const w342Src = `${baseUrl}/w342/${fileName}`;
      const w500Src = `${baseUrl}/w500/${fileName}`;
      
      return {
        src: w342Src,
        srcSet: `${w342Src} 1x, ${w500Src} 2x`,
        loading: 'lazy' as const,
        decoding: 'async' as const,
        width: 342,
        height: 513
      };
    }
  }
  
  // For local storage or non-TMDB images, return as-is with lazy loading
  return {
    src: imageUrl,
    loading: 'lazy' as const,
    decoding: 'async' as const
  };
};
