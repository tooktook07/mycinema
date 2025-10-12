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
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[9998]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-full w-full sm:w-[400px] bg-card border-l border-border shadow-lg z-[9999] animate-slide-in-right"
        role="dialog"
        aria-modal="true"
        aria-labelledby="accessibility-panel-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 id="accessibility-panel-title" className="text-lg font-semibold">
            Accessibility Options
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close accessibility panel"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <ScrollArea className="h-[calc(100vh-8rem)]">
          <div className="p-4 space-y-4">
            <Accordion type="multiple" defaultValue={['profiles', 'text', 'visual', 'navigation']}>
              <AccordionItem value="profiles">
                <AccordionTrigger>Quick Profiles</AccordionTrigger>
                <AccordionContent>
                  <AccessibilityProfiles />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="text">
                <AccordionTrigger>Text Adjustments</AccordionTrigger>
                <AccordionContent>
                  <TextControls />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="visual">
                <AccordionTrigger>Visual Adjustments</AccordionTrigger>
                <AccordionContent>
                  <VisualControls />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="navigation">
                <AccordionTrigger>Navigation & Focus</AccordionTrigger>
                <AccordionContent>
                  <NavigationControls />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-card">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleReset}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset All Settings
          </Button>
        </div>
      </div>
    </>
  );
}
