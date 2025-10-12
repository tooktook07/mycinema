import { MousePointer, Focus, Link2, BookOpen, Orbit } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { announceToScreenReader } from '@/lib/accessibilityUtils';

export function NavigationControls() {
  const { settings, updateSettings } = useAccessibility();

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <MousePointer className="h-4 w-4" />
          Cursor Size
        </Label>
        <RadioGroup
          value={settings.cursorSize}
          onValueChange={(value) => {
            updateSettings({ cursorSize: value as any });
            announceToScreenReader(`Cursor size set to ${value}`);
          }}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="normal" id="cursor-normal" />
            <Label htmlFor="cursor-normal" className="cursor-pointer font-normal">Normal</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="large" id="cursor-large" />
            <Label htmlFor="cursor-large" className="cursor-pointer font-normal">Large</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="extra-large" id="cursor-extra-large" />
            <Label htmlFor="cursor-extra-large" className="cursor-pointer font-normal">Extra Large</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="flex items-center justify-between pt-2">
        <Label htmlFor="enhanced-focus" className="cursor-pointer flex items-center gap-2">
          <Focus className="h-4 w-4" />
          Enhanced Focus Indicators
        </Label>
        <Switch
          id="enhanced-focus"
          checked={settings.enhancedFocus}
          onCheckedChange={(checked) => {
            updateSettings({ enhancedFocus: checked });
            announceToScreenReader(checked ? 'Enhanced focus enabled' : 'Enhanced focus disabled');
          }}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="highlight-links" className="cursor-pointer flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          Highlight Links
        </Label>
        <Switch
          id="highlight-links"
          checked={settings.highlightLinks}
          onCheckedChange={(checked) => {
            updateSettings({ highlightLinks: checked });
            announceToScreenReader(checked ? 'Link highlighting enabled' : 'Link highlighting disabled');
          }}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="reading-guide" className="cursor-pointer flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          Reading Guide
        </Label>
        <Switch
          id="reading-guide"
          checked={settings.readingGuide}
          onCheckedChange={(checked) => {
            updateSettings({ readingGuide: checked });
            announceToScreenReader(checked ? 'Reading guide enabled' : 'Reading guide disabled');
          }}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="reduce-motion" className="cursor-pointer flex items-center gap-2">
          <Orbit className="h-4 w-4" />
          Reduce Motion
        </Label>
        <Switch
          id="reduce-motion"
          checked={settings.reduceMotion}
          onCheckedChange={(checked) => {
            updateSettings({ reduceMotion: checked });
            announceToScreenReader(checked ? 'Motion reduced' : 'Motion restored');
          }}
        />
      </div>
    </div>
  );
}
