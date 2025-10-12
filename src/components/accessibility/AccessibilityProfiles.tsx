import { Eye, Hand, Brain, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { announceToScreenReader } from '@/lib/accessibilityUtils';

export function AccessibilityProfiles() {
  const { applyProfile } = useAccessibility();

  const profiles = [
    {
      id: 'visual',
      label: 'Visual Impairment',
      description: 'Large text, high contrast, dyslexia font',
      icon: Eye,
    },
    {
      id: 'motor',
      label: 'Motor Impairment',
      description: 'Large cursor, enhanced focus, reduced motion',
      icon: Hand,
    },
    {
      id: 'cognitive',
      label: 'Cognitive Support',
      description: 'Reading guide, simplified layout, reduced motion',
      icon: Brain,
    },
    {
      id: 'dyslexia',
      label: 'Dyslexia Friendly',
      description: 'Dyslexia font, increased spacing, reading guide',
      icon: BookOpen,
    },
  ];

  const handleProfileClick = (profileId: string, profileLabel: string) => {
    applyProfile(profileId);
    announceToScreenReader(`${profileLabel} profile applied`);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground mb-4">
        Quick presets for common accessibility needs
      </p>
      <div className="grid gap-3">
        {profiles.map((profile) => {
          const Icon = profile.icon;
          return (
            <Button
              key={profile.id}
              variant="outline"
              className="justify-start h-auto p-4 text-left"
              onClick={() => handleProfileClick(profile.id, profile.label)}
            >
              <div className="flex items-start gap-3 w-full">
                <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{profile.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {profile.description}
                  </div>
                </div>
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
