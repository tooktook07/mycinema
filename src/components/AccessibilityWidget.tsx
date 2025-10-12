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
            variant="outline"
            className="fixed bottom-4 right-4 z-[9997] h-12 w-12 rounded-full shadow-lg bg-card/95 backdrop-blur-sm"
            onClick={() => setIsPanelOpen(!isPanelOpen)}
            aria-label="Open accessibility options"
          >
            <Accessibility className="h-5 w-5" />
            {hasNonDefaultSettings && (
              <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-primary border-2 border-background" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>Accessibility</p>
        </TooltipContent>
      </Tooltip>

      <AccessibilityPanel isOpen={isPanelOpen} onClose={() => setIsPanelOpen(false)} />
    </>
  );
}
