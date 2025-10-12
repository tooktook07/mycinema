import { useState } from 'react';
import { Accessibility } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AccessibilityPanel } from '@/components/AccessibilityPanel';
import { useAccessibility } from '@/contexts/AccessibilityContext';

export function AccessibilityWidget() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const { hasNonDefaultSettings } = useAccessibility();

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            className="fixed bottom-4 right-4 z-[9997] h-14 w-14 rounded-full shadow-lg"
            onClick={() => setIsPanelOpen(!isPanelOpen)}
            aria-label="Open accessibility options"
          >
            <Accessibility className="h-6 w-6" />
            {hasNonDefaultSettings && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary border-2 border-background" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>Accessibility Options</p>
        </TooltipContent>
      </Tooltip>

      <AccessibilityPanel isOpen={isPanelOpen} onClose={() => setIsPanelOpen(false)} />
    </>
  );
}
