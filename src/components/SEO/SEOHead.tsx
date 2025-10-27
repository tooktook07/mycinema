import { Helmet } from 'react-helmet-async';
import { SEOProps } from './types';

export const SEOHead = ({
  title,
  description,
  image,
  imageAlt,
  type = 'website',
  url,
  noindex = false,
  canonical,
  schema,
}: SEOProps) => {
  const siteUrl = window.location.origin;
  const pageUrl = url || window.location.href;
  const canonicalUrl = canonical || pageUrl;
  
  // Use default image if none provided
  const ogImage = image || `${siteUrl}/og-default.jpg`;
  const ogImageAlt = imageAlt || 'CineMatch - Discover Your Perfect Movie Match';

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{title}</title>
      <meta name="title" content={title} />
      <meta name="description" content={description} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:alt" content={ogImageAlt} />
      <meta property="og:site_name" content="CineMatch" />
      <meta property="og:locale" content="en_US" />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={pageUrl} />
      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={ogImage} />
      <meta property="twitter:image:alt" content={ogImageAlt} />

      {/* Schema.org JSON-LD */}
      {schema && (
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      )}
    </Helmet>
  );
};
