import { BreadcrumbItem } from '../types';

export const generateBreadcrumbSchema = (items: BreadcrumbItem[]) => {
  const siteUrl = window.location.origin;

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${siteUrl}${item.url}`,
    })),
  };
};
