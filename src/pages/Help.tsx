import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Film, Heart, ThumbsUp, ThumbsDown, Bookmark, Sparkles, User, HelpCircle, RefreshCw, Eye, Hand, Brain, BookOpen, Accessibility } from "lucide-react";

const Help = () => {
  useEffect(() => {
    // Set page title
    document.title = "Help Center - MyCinema Movie Discovery Guide";
    
    // Set meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", "Complete guide to using MyCinema. Learn how to browse movies, use AI recommendations, rate films, manage your watchlist, and discover your next favorite movie.");
    }
    
    // Set canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', window.location.origin + '/help');
    
    // Add structured data for FAQ
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How many movies should I rate to get good recommendations?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "At least 5 movies to start, but 20+ ratings will give you much better recommendations."
          }
        },
        {
          "@type": "Question",
          "name": "Why am I seeing movies I already rated?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "You might be seeing them in Browse mode - Discover Mode won't show rated movies. If you're in Discover Mode, try refreshing recommendations."
          }
        },
        {
          "@type": "Question",
          "name": "What's the difference between watchlist and ratings?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Watchlist contains movies you want to watch (saved for later), while Ratings are for movies you've seen and rated (which trains your AI recommendations)."
          }
        },
        {
          "@type": "Question",
          "name": "Do I need an account?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No, but guests can only store ratings in their browser. Creating an account syncs everything to the cloud."
          }
        },
        {
          "@type": "Question",
          "name": "Can I change a rating after I've given it?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes! Just click a different rating button on the same movie."
          }
        },
        {
          "@type": "Question",
          "name": "Is my data private?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, your ratings and watchlist are private to your account only."
          }
        }
      ]
    };
    
    let script = document.querySelector('script[type="application/ld+json"]');
    if (!script) {
      script = document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(structuredData);
    
    // Cleanup function
    return () => {
      document.title = "MyCinema - AI-Powered Movie Recommendations";
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute("content", "Discover movies you'll love with MyCinema's smart similarity algorithm. Get personalized recommendations based on your ratings, favorite genres, directors, and actors.");
      }
      const structuredScript = document.querySelector('script[type="application/ld+json"]');
      if (structuredScript) {
        structuredScript.remove();
      }
    };
  }, []);
  return (
    <main className="min-h-screen bg-background">
      <article className="container max-w-5xl mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <header className="mb-8 md:mb-12 text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Film className="h-10 w-10 text-primary" aria-hidden="true" />
            <h1 className="text-4xl md:text-5xl font-bold">Help Center</h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Your personalized movie discovery companion. Browse thousands of movies and get AI-powered recommendations based on your taste.
          </p>
        </header>

        {/* Quick Start Alert */}
        <Alert className="mb-8 border-primary/50 bg-primary/5">
          <Sparkles className="h-5 w-5 text-primary" />
          <AlertDescription className="text-base">
            <strong>Quick Start:</strong> You can start browsing immediately without an account. Rate movies to train your personal AI recommendations, then create an account to sync your ratings across devices.
          </AlertDescription>
        </Alert>

        {/* Main Content */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">Documentation</CardTitle>
            <CardDescription>Everything you need to know about using the app</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              
              {/* Getting Started */}
              <AccordionItem value="getting-started">
                <AccordionTrigger className="text-lg font-semibold">
                  <div className="flex items-center gap-2">
                    <Film className="h-5 w-5" />
                    Getting Started
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 text-base">
                  <p className="text-muted-foreground">Start your movie discovery journey here. Learn the basics of how to use the app and what features are available.</p>
                  
                  <div>
                    <h4 className="font-semibold mb-2">For New Users</h4>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>You can start browsing immediately without an account</li>
                      <li>Rate movies to train your personal AI recommendations</li>
                      <li>Create an account to sync your ratings across devices</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Two Ways to Use</h4>
                    <div className="grid gap-3">
                      <div className="p-3 rounded-lg border bg-card">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="h-4 w-4" />
                          <strong>Guest Mode</strong>
                        </div>
                        <p className="text-muted-foreground">Browse and rate movies (stored in your browser only)</p>
                      </div>
                      <div className="p-3 rounded-lg border bg-card">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="h-4 w-4" />
                          <strong>Registered User</strong>
                        </div>
                        <p className="text-muted-foreground">Full features with cloud sync and unlimited watchlist</p>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Accessibility Features */}
              <AccordionItem value="accessibility">
                <AccordionTrigger className="text-lg font-semibold">
                  <div className="flex items-center gap-2">
                    <Accessibility className="h-5 w-5" />
                    Accessibility Features ♿
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 text-base">
                  <p className="text-muted-foreground">Customize your viewing experience with comprehensive accessibility options. Access the accessibility panel by clicking the accessibility icon in the bottom right corner of the screen.</p>
                  
                  <Alert className="border-primary/50 bg-primary/5">
                    <Accessibility className="h-4 w-4 text-primary" />
                    <AlertDescription>
                      <strong>Quick Access:</strong> Look for the accessibility widget icon (♿) in the bottom right corner to open the full accessibility control panel.
                    </AlertDescription>
                  </Alert>

                  <div>
                    <h4 className="font-semibold mb-3">Accessibility Profiles</h4>
                    <p className="text-muted-foreground mb-3">Quick presets that apply multiple settings at once for common accessibility needs:</p>
                    <div className="grid gap-3">
                      <div className="p-3 rounded-lg border bg-card flex items-start gap-3">
                        <Eye className="h-5 w-5 mt-0.5 text-primary" />
                        <div>
                          <strong>Visual Impairment</strong>
                          <p className="text-muted-foreground mt-1">Applies large text, high contrast mode, and dyslexia-friendly font for better readability</p>
                        </div>
                      </div>
                      <div className="p-3 rounded-lg border bg-card flex items-start gap-3">
                        <Hand className="h-5 w-5 mt-0.5 text-primary" />
                        <div>
                          <strong>Motor Impairment</strong>
                          <p className="text-muted-foreground mt-1">Enables large cursor, enhanced focus indicators, and reduced motion for easier navigation</p>
                        </div>
                      </div>
                      <div className="p-3 rounded-lg border bg-card flex items-start gap-3">
                        <Brain className="h-5 w-5 mt-0.5 text-primary" />
                        <div>
                          <strong>Cognitive Support</strong>
                          <p className="text-muted-foreground mt-1">Activates reading guide, simplified layout, and reduced motion to minimize distractions</p>
                        </div>
                      </div>
                      <div className="p-3 rounded-lg border bg-card flex items-start gap-3">
                        <BookOpen className="h-5 w-5 mt-0.5 text-primary" />
                        <div>
                          <strong>Dyslexia Friendly</strong>
                          <p className="text-muted-foreground mt-1">Uses dyslexia-friendly font with increased spacing and reading guide for easier reading</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Text Controls</h4>
                    <p className="text-muted-foreground mb-2">Fine-tune text appearance for optimal readability:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li><strong>Font Size:</strong> Adjust text size from small to extra large</li>
                      <li><strong>Line Height:</strong> Control spacing between lines of text</li>
                      <li><strong>Letter Spacing:</strong> Adjust space between individual letters</li>
                      <li><strong>Word Spacing:</strong> Control space between words</li>
                      <li><strong>Dyslexia Font:</strong> Enable OpenDyslexic font designed for easier reading</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Visual Controls</h4>
                    <p className="text-muted-foreground mb-2">Adjust visual elements for better perception:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li><strong>Contrast Mode:</strong> Choose between normal, high, or extra high contrast</li>
                      <li><strong>Color Blind Mode:</strong> Options for protanopia (red-blind), deuteranopia (green-blind), and tritanopia (blue-blind)</li>
                      <li><strong>Grayscale:</strong> Remove all colors for a monochrome experience</li>
                      <li><strong>Hide Images:</strong> Focus on text by hiding all images</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Navigation Controls</h4>
                    <p className="text-muted-foreground mb-2">Enhance navigation and interaction:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li><strong>Cursor Size:</strong> Choose between normal, large, or extra large cursor</li>
                      <li><strong>Enhanced Focus:</strong> Make focused elements more visible with prominent outlines</li>
                      <li><strong>Highlight Links:</strong> Make all clickable links stand out with underlines and highlighting</li>
                      <li><strong>Reading Guide:</strong> A horizontal ruler that follows your mouse to help track lines of text</li>
                      <li><strong>Reduce Motion:</strong> Minimize animations and transitions for users sensitive to motion</li>
                    </ul>
                  </div>

                  <Alert>
                    <AlertDescription>
                      <strong>Settings Persistence:</strong> Your accessibility preferences are automatically saved and will be applied every time you visit the app.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              {/* Browse Movies */}
              <AccordionItem value="browse">
                <AccordionTrigger className="text-lg font-semibold">
                  <div className="flex items-center gap-2">
                    <Film className="h-5 w-5" />
                    Browse Movies
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 text-base">
                  <p className="text-muted-foreground">Explore our extensive movie library with powerful filtering and sorting tools. Find exactly what you're looking for or discover something new.</p>
                  
                  <div>
                    <h4 className="font-semibold mb-2">View Options</h4>
                    <ul className="list-disc pl-6 space-y-2">
                      <li><strong>Grid view:</strong> Visual poster layout</li>
                      <li><strong>Table view:</strong> Detailed information in rows</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Filtering Movies</h4>
                    <ul className="list-disc pl-6 space-y-2">
                      <li><strong>By Genre:</strong> Action, Comedy, Drama, Horror, Sci-Fi, Thriller, Romance, Documentary, Animation, Fantasy</li>
                      <li><strong>By Rating:</strong> IMDb ratings from 0.0 to 10.0 (falls back to TMDB if IMDb unavailable)</li>
                      <li><strong>By Year:</strong> Filter movies from any decade</li>
                      <li><strong>Search:</strong> Find movies by title, actors, directors, writers, keywords, or awards</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Sorting Options</h4>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>By rating (highest first)</li>
                      <li>By year (newest first)</li>
                      <li>By title (A-Z)</li>
                      <li>By your rating</li>
                    </ul>
                  </div>

                  <Alert>
                    <AlertDescription>
                      <strong>Tip:</strong> Click "Reset All Filters" to clear all selections and start fresh.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              {/* Discover Mode */}
              <AccordionItem value="discover">
                <AccordionTrigger className="text-lg font-semibold">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Discover Mode 🎬
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 text-base">
                  <p className="text-muted-foreground">A full-screen, immersive experience where you swipe through movies one at a time, perfect for finding your next watch. Learn how to navigate, rate, and manage your discovery journey.</p>

                  <div>
                    <h4 className="font-semibold mb-3">Rating Options</h4>
                    <div className="grid gap-3">
                      <div className="p-3 rounded-lg border bg-card flex items-start gap-3">
                        <ThumbsDown className="h-5 w-5 mt-0.5 text-destructive" />
                        <div>
                          <strong>Not for me</strong> <Badge variant="outline" className="ml-2">Left button</Badge>
                          <p className="text-muted-foreground mt-1">Movies you're not interested in</p>
                        </div>
                      </div>
                      <div className="p-3 rounded-lg border bg-card flex items-start gap-3">
                        <ThumbsUp className="h-5 w-5 mt-0.5 text-blue-500" />
                        <div>
                          <strong>I like it</strong> <Badge variant="outline" className="ml-2">Middle button</Badge>
                          <p className="text-muted-foreground mt-1">Good movies you enjoyed</p>
                        </div>
                      </div>
                      <div className="p-3 rounded-lg border bg-card flex items-start gap-3">
                        <Heart className="h-5 w-5 mt-0.5 text-red-500" />
                        <div>
                          <strong>Love it!</strong> <Badge variant="outline" className="ml-2">Right button</Badge>
                          <p className="text-muted-foreground mt-1">Your absolute favorites</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Navigation</h4>
                    <ul className="list-disc pl-6 space-y-2">
                      <li><strong>Tap top 30% of screen:</strong> Go back to previous movie</li>
                      <li><strong>Tap bottom 50% of screen:</strong> Skip to next movie</li>
                      <li><strong>"Next Movie" button:</strong> Skip without rating</li>
                      <li><strong>Watchlist button:</strong> Save movie to watch later</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Your Progress</h4>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>See total movies rated at the top</li>
                      <li>Track session ratings</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Managing Viewing History</h4>
                    <ul className="list-disc pl-6 space-y-2">
                      <li><strong>Refresh Recommendations:</strong> Clear older history to see more variety</li>
                      <li><strong>Clear All History:</strong> Start fresh (available when you've seen many movies)</li>
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* AI Recommendations */}
              <AccordionItem value="recommendations">
                <AccordionTrigger className="text-lg font-semibold">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    AI Recommendations For You 🤖
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 text-base">
                  <p className="text-lg">The app learns from your ratings to suggest movies you'll love.</p>

                  <Alert className="border-primary/50 bg-primary/5">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <AlertDescription>
                      <strong>Getting Started:</strong> Rate at least 5 movies to activate personalized recommendations. The more you rate, the better the recommendations!
                    </AlertDescription>
                  </Alert>

                  <div>
                    <h4 className="font-semibold mb-2">What Makes a Good Recommendation</h4>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Movies with similar genres to ones you loved</li>
                      <li>Directors and actors from your favorite films</li>
                      <li>Similar themes and keywords</li>
                      <li>Quality threshold: Only suggests movies rated 6.0+ overall</li>
                      <li>Hidden gems: Discovers great movies you might have missed</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Improving Your Recommendations</h4>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Rate more movies (especially ❤️ Love it and 👍 I like it)</li>
                      <li>Recent ratings matter more (your taste evolves!)</li>
                      <li>Mix of genres helps find diverse recommendations</li>
                    </ul>
                  </div>

                  <div className="flex items-start gap-2 p-3 rounded-lg border bg-card">
                    <RefreshCw className="h-5 w-5 mt-0.5 text-primary" />
                    <div>
                      <strong>Refreshing Recommendations</strong>
                      <p className="text-muted-foreground mt-1">Click the refresh button to get new suggestions. Recommendations update automatically as you rate.</p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Watchlist */}
              <AccordionItem value="watchlist">
                <AccordionTrigger className="text-lg font-semibold">
                  <div className="flex items-center gap-2">
                    <Bookmark className="h-5 w-5" />
                    Watchlist 📝
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 text-base">
                  <p className="text-muted-foreground">Your personal collection of movies you want to watch later. Save interesting titles and access them anytime from your watchlist page.</p>

                  <div>
                    <h4 className="font-semibold mb-2">How to Add Movies</h4>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Click the bookmark icon on any movie card</li>
                      <li>Add from Discover Mode during swiping</li>
                      <li>Movies stay in your list until you remove them</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Accessing Your Watchlist</h4>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Click "Watchlist" in the navigation menu</li>
                      <li>See all saved movies in one place</li>
                      <li>Remove movies by clicking the bookmark icon again</li>
                    </ul>
                  </div>

                  <Alert>
                    <AlertDescription>
                      <strong>Note:</strong> Guests have limited watchlist stored in browser only. Registered users get full watchlist synced across all devices.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              {/* My Ratings */}
              <AccordionItem value="ratings">
                <AccordionTrigger className="text-lg font-semibold">
                  <div className="flex items-center gap-2">
                    <Heart className="h-5 w-5" />
                    My Ratings ⭐
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 text-base">
                  <p className="text-muted-foreground">Your ratings power the AI recommendation engine. Understand the three rating types and how each one influences your personalized suggestions.</p>
                  
                  <h4 className="font-semibold mb-3">Three Rating Types</h4>
                  
                  <div className="grid gap-3">
                    <div className="p-4 rounded-lg border bg-card">
                      <div className="flex items-center gap-2 mb-2">
                        <Heart className="h-5 w-5 text-red-500" />
                        <strong className="text-lg">Love it! (10 points)</strong>
                      </div>
                      <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                        <li>Your favorite movies</li>
                        <li>Films you'd watch multiple times</li>
                        <li>Recommendations will heavily favor similar movies</li>
                      </ul>
                    </div>

                    <div className="p-4 rounded-lg border bg-card">
                      <div className="flex items-center gap-2 mb-2">
                        <ThumbsUp className="h-5 w-5 text-blue-500" />
                        <strong className="text-lg">I like it (5 points)</strong>
                      </div>
                      <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                        <li>Good movies you enjoyed</li>
                        <li>Would recommend to friends</li>
                        <li>Balanced influence on recommendations</li>
                      </ul>
                    </div>

                    <div className="p-4 rounded-lg border bg-card">
                      <div className="flex items-center gap-2 mb-2">
                        <ThumbsDown className="h-5 w-5 text-muted-foreground" />
                        <strong className="text-lg">Not for me (1 point)</strong>
                      </div>
                      <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                        <li>Movies that weren't your taste</li>
                        <li>Helps avoid similar suggestions</li>
                        <li>Doesn't mean it's a bad movie - just not for you</li>
                      </ul>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Where to Rate</h4>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Browse Movies page: Three buttons below each poster</li>
                      <li>Discover Mode: Three main buttons at bottom</li>
                      <li>Movie details modal: Quick rate options</li>
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Guest Mode */}
              <AccordionItem value="guest">
                <AccordionTrigger className="text-lg font-semibold">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Guest Mode 👤
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 text-base">
                  <p className="text-muted-foreground">You can use most features without creating an account. Here's what's available in Guest Mode and what you'll gain by registering.</p>
                  
                  <div>
                    <h4 className="font-semibold mb-2">What You Can Do</h4>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2">
                        <span className="text-green-500">✅</span> Browse all movies
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-green-500">✅</span> Use all filters and search
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-green-500">✅</span> Rate movies (stored locally)
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-green-500">✅</span> Get AI recommendations
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-green-500">✅</span> Use Discover Mode
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-green-500">✅</span> Limited watchlist
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Limitations</h4>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2">
                        <span className="text-yellow-500">⚠️</span> Ratings stored in browser only (not synced)
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-yellow-500">⚠️</span> Clear browser data = lose all ratings
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-yellow-500">⚠️</span> Can't access ratings on other devices
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-yellow-500">⚠️</span> Limited watchlist capacity
                      </li>
                    </ul>
                  </div>

                  <Alert className="border-primary/50 bg-primary/5">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <AlertDescription>
                      <strong>Why Create an Account?</strong>
                      <ul className="mt-2 space-y-1">
                        <li>☁️ Sync ratings across all devices</li>
                        <li>📱 Access from phone, tablet, computer</li>
                        <li>📝 Unlimited watchlist</li>
                        <li>🔒 Never lose your data</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              {/* Troubleshooting */}
              <AccordionItem value="troubleshooting">
                <AccordionTrigger className="text-lg font-semibold">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="h-5 w-5" />
                    Troubleshooting 🔧
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 text-base">
                  <p className="text-muted-foreground">Having issues? Find solutions to common problems and learn how to get the most out of the app.</p>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">"No recommendations appearing"</h4>
                      <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                        <li>Rate at least 5 movies to activate AI recommendations</li>
                        <li>Try rating movies you love (❤️) for better results</li>
                        <li>Refresh the page</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">"Same movies keep appearing"</h4>
                      <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                        <li>Use "Refresh Recommendations" in Discover Mode</li>
                        <li>Rate more diverse genres</li>
                        <li>Clear viewing history if needed</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">"Movies not loading"</h4>
                      <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                        <li>Check your internet connection</li>
                        <li>Try refreshing the page</li>
                        <li>Clear browser cache</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">"My ratings disappeared (Guest Mode)"</h4>
                      <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                        <li>Guest ratings are stored in browser only</li>
                        <li>Browser cache cleared = ratings lost</li>
                        <li>Solution: Create an account to prevent this</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">"Can't add to watchlist"</h4>
                      <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                        <li>Guests have limited watchlist capacity</li>
                        <li>Create an account for unlimited watchlist</li>
                        <li>Remove old items to add new ones</li>
                      </ul>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* FAQs */}
              <AccordionItem value="faq">
                <AccordionTrigger className="text-lg font-semibold">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="h-5 w-5" />
                    Frequently Asked Questions ❓
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 text-base">
                  <p className="text-muted-foreground">Quick answers to the most common questions about ratings, accounts, privacy, and features.</p>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">How many movies should I rate to get good recommendations?</h4>
                      <p className="text-muted-foreground">At least 5 movies to start, but 20+ ratings will give you much better recommendations.</p>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Why am I seeing movies I already rated?</h4>
                      <p className="text-muted-foreground">You might be seeing them in Browse mode - Discover Mode won't show rated movies. If you're in Discover Mode, try refreshing recommendations.</p>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">How do I clear my viewing history?</h4>
                      <p className="text-muted-foreground">In Discover Mode, when you run out of recommendations, you'll see "Refresh Recommendations" or "Clear All History" buttons.</p>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">What's the difference between watchlist and ratings?</h4>
                      <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                        <li><strong>Watchlist:</strong> Movies you want to watch (saved for later)</li>
                        <li><strong>Ratings:</strong> Movies you've seen and rated (trains your AI)</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Can I change a rating after I've given it?</h4>
                      <p className="text-muted-foreground">Yes! Just click a different rating button on the same movie.</p>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">What does "Not for me" mean?</h4>
                      <p className="text-muted-foreground">It tells the AI this movie isn't your taste, so it won't recommend similar ones. It doesn't affect the movie's overall rating.</p>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Do I need an account?</h4>
                      <p className="text-muted-foreground">No, but guests can only store ratings in their browser. Creating an account syncs everything to the cloud.</p>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Is my data private?</h4>
                      <p className="text-muted-foreground">Yes, your ratings and watchlist are private to your account only.</p>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">How often is the movie database updated?</h4>
                      <p className="text-muted-foreground">The database is regularly updated with new releases and enriched data.</p>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Can I export my data?</h4>
                      <p className="text-muted-foreground">Contact support for data export requests.</p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

            </Accordion>
          </CardContent>
        </Card>

        {/* Footer */}
        <footer className="text-center text-muted-foreground">
          <p>Need more help? Contact our support team.</p>
        </footer>
      </article>
    </main>
  );
};

export default Help;
