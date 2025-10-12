import { useEffect, useState } from 'react';
import { useAccessibility } from '@/contexts/AccessibilityContext';

export function ReadingGuide() {
  const { settings } = useAccessibility();
  const [position, setPosition] = useState(0);

  useEffect(() => {
    if (!settings.readingGuide) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition(e.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [settings.readingGuide]);

  if (!settings.readingGuide) return null;

  return (
    <div
      className="reading-guide-ruler"
      style={{ top: `${position - 30}px` }}
      aria-hidden="true"
    />
  );
}
