import { Type, AlignLeft, Space } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { announceToScreenReader } from '@/lib/accessibilityUtils';

export function TextControls() {
  const { settings, updateSettings } = useAccessibility();

  const handleFontSizeChange = (value: number[]) => {
    updateSettings({ fontSize: value[0] });
    announceToScreenReader(`Font size set to ${value[0]}%`);
  };

  const handleLetterSpacingChange = (value: number[]) => {
    updateSettings({ letterSpacing: value[0] });
  };

  const handleLineHeightChange = (value: number[]) => {
    updateSettings({ lineHeight: value[0] });
  };

  const handleWordSpacingChange = (value: number[]) => {
    updateSettings({ wordSpacing: value[0] });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="font-size" className="flex items-center gap-2">
            <Type className="h-4 w-4" />
            Font Size
          </Label>
          <span className="text-sm text-muted-foreground">{settings.fontSize}%</span>
        </div>
        <Slider
          id="font-size"
          min={75}
          max={200}
          step={5}
          value={[settings.fontSize]}
          onValueChange={handleFontSizeChange}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="line-height" className="flex items-center gap-2">
            <AlignLeft className="h-4 w-4" />
            Line Height
          </Label>
          <span className="text-sm text-muted-foreground">{settings.lineHeight.toFixed(2)}</span>
        </div>
        <Slider
          id="line-height"
          min={1.2}
          max={2.5}
          step={0.1}
          value={[settings.lineHeight]}
          onValueChange={handleLineHeightChange}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="letter-spacing" className="flex items-center gap-2">
            <Space className="h-4 w-4" />
            Letter Spacing
          </Label>
          <span className="text-sm text-muted-foreground">{settings.letterSpacing.toFixed(2)}em</span>
        </div>
        <Slider
          id="letter-spacing"
          min={0}
          max={0.2}
          step={0.01}
          value={[settings.letterSpacing]}
          onValueChange={handleLetterSpacingChange}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="word-spacing" className="flex items-center gap-2">
            <Space className="h-4 w-4" />
            Word Spacing
          </Label>
          <span className="text-sm text-muted-foreground">{settings.wordSpacing.toFixed(2)}em</span>
        </div>
        <Slider
          id="word-spacing"
          min={0}
          max={0.3}
          step={0.01}
          value={[settings.wordSpacing]}
          onValueChange={handleWordSpacingChange}
        />
      </div>

      <div className="flex items-center justify-between pt-2">
        <Label htmlFor="dyslexia-font" className="cursor-pointer">
          Dyslexia-Friendly Font
        </Label>
        <Switch
          id="dyslexia-font"
          checked={settings.dyslexiaFont}
          onCheckedChange={(checked) => {
            updateSettings({ dyslexiaFont: checked });
            announceToScreenReader(checked ? 'Dyslexia font enabled' : 'Dyslexia font disabled');
          }}
        />
      </div>
    </div>
  );
}
