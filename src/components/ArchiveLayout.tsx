import { Link } from "react-router-dom";
import { Home, ChevronRight } from "lucide-react";
import { ReactNode } from "react";

interface Breadcrumb {
  label: string;
  href: string;
}

interface ArchiveLayoutProps {
  title: string;
  description?: string;
  breadcrumbs: Breadcrumb[];
  movieCount: number;
  children: ReactNode;
}

export const ArchiveLayout = ({ 
  title, 
  description, 
  breadcrumbs, 
  movieCount,
  children 
}: ArchiveLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground transition-colors flex items-center gap-1">
            <Home className="h-4 w-4" />
            Home
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link to="/movies" className="hover:text-foreground transition-colors">
            Movies
          </Link>
          {breadcrumbs.map((crumb, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4" />
              {idx === breadcrumbs.length - 1 ? (
                <span className="text-foreground font-medium">{crumb.label}</span>
              ) : (
                <Link to={crumb.href} className="hover:text-foreground transition-colors">
                  {crumb.label}
                </Link>
              )}
            </div>
          ))}
        </nav>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">{title}</h1>
            {description && <p className="text-muted-foreground text-lg mt-1">{description}</p>}
          </div>
          <p className="text-muted-foreground">
            Showing {movieCount.toLocaleString()} {movieCount === 1 ? 'movie' : 'movies'}
          </p>
        </div>

        {/* Content (grid of movies) */}
        {children}
      </div>
    </div>
  );
};
