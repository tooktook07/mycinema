import { X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { TextControls } from '@/components/accessibility/TextControls';
import { VisualControls } from '@/components/accessibility/VisualControls';
import { NavigationControls } from '@/components/accessibility/NavigationControls';
import { AccessibilityProfiles } from '@/components/accessibility/AccessibilityProfiles';
import { announceToScreenReader } from '@/lib/accessibilityUtils';

interface AccessibilityPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AccessibilityPanel({ isOpen, onClose }: AccessibilityPanelProps) {
  const { resetSettings } = useAccessibility();

  const handleReset = () => {
    resetSettings();
    announceToScreenReader('All accessibility settings reset to default');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed top-0 right-0 h-full w-full sm:w-[380px] bg-card/95 backdrop-blur-sm border-l border-border shadow-2xl z-[9999] animate-slide-in-right"
      role="dialog"
      aria-modal="true"
      aria-labelledby="accessibility-panel-title"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border/50">
        <h2 id="accessibility-panel-title" className="text-base font-medium">
          Accessibility
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onClose}
          aria-label="Close accessibility panel"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="h-[calc(100vh-7rem)]">
        <div className="p-3 space-y-2">
          <Accordion type="multiple" defaultValue={['profiles', 'text', 'visual', 'navigation']} className="space-y-1">
            <AccordionItem value="profiles" className="border-none">
              <AccordionTrigger className="text-sm py-2 hover:no-underline">Profiles</AccordionTrigger>
              <AccordionContent className="pb-2">
                <AccessibilityProfiles />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="text" className="border-none">
              <AccordionTrigger className="text-sm py-2 hover:no-underline">Text</AccordionTrigger>
              <AccordionContent className="pb-2">
                <TextControls />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="visual" className="border-none">
              <AccordionTrigger className="text-sm py-2 hover:no-underline">Visual</AccordionTrigger>
              <AccordionContent className="pb-2">
                <VisualControls />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="navigation" className="border-none">
              <AccordionTrigger className="text-sm py-2 hover:no-underline">Navigation</AccordionTrigger>
              <AccordionContent className="pb-2">
                <NavigationControls />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-border/50 bg-card/95 backdrop-blur-sm">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleReset}
        >
          <RotateCcw className="h-3.5 w-3.5 mr-2" />
          Reset All
        </Button>
      </div>
    </div>
  );
}
