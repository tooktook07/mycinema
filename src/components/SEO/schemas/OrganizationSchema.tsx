export const generateOrganizationSchema = () => {
  const siteUrl = window.location.origin;
  
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'CineMatch',
    description: 'Discover your perfect movie match with personalized recommendations based on your taste',
    url: siteUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}/movies?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
    publisher: {
      '@type': 'Organization',
      name: 'CineMatch',
      url: siteUrl,
    },
  };
};
