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
    <div className="space-y-2">
      <div className="grid gap-2">
        {profiles.map((profile) => {
          const Icon = profile.icon;
          return (
            <Button
              key={profile.id}
              variant="outline"
              size="sm"
              className="justify-start h-auto p-2 text-left"
              onClick={() => handleProfileClick(profile.id, profile.label)}
            >
              <div className="flex items-center gap-2 w-full">
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm">{profile.label}</span>
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
