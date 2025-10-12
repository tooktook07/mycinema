import { Contrast, Eye, Palette, ImageOff } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { announceToScreenReader } from '@/lib/accessibilityUtils';

export function VisualControls() {
  const { settings, updateSettings } = useAccessibility();

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Contrast className="h-4 w-4" />
          Contrast Mode
        </Label>
        <RadioGroup
          value={settings.contrastMode}
          onValueChange={(value) => {
            updateSettings({ contrastMode: value as any });
            announceToScreenReader(`Contrast mode set to ${value}`);
          }}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="normal" id="contrast-normal" />
            <Label htmlFor="contrast-normal" className="cursor-pointer font-normal">Normal</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="high" id="contrast-high" />
            <Label htmlFor="contrast-high" className="cursor-pointer font-normal">High</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="very-high" id="contrast-very-high" />
            <Label htmlFor="contrast-very-high" className="cursor-pointer font-normal">Very High</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Palette className="h-4 w-4" />
          Color Blind Mode
        </Label>
        <RadioGroup
          value={settings.colorBlindMode}
          onValueChange={(value) => {
            updateSettings({ colorBlindMode: value as any });
            announceToScreenReader(`Color blind mode set to ${value}`);
          }}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="none" id="colorblind-none" />
            <Label htmlFor="colorblind-none" className="cursor-pointer font-normal">None</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="protanopia" id="colorblind-protanopia" />
            <Label htmlFor="colorblind-protanopia" className="cursor-pointer font-normal">Protanopia (Red-Blind)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="deuteranopia" id="colorblind-deuteranopia" />
            <Label htmlFor="colorblind-deuteranopia" className="cursor-pointer font-normal">Deuteranopia (Green-Blind)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="tritanopia" id="colorblind-tritanopia" />
            <Label htmlFor="colorblind-tritanopia" className="cursor-pointer font-normal">Tritanopia (Blue-Blind)</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="flex items-center justify-between pt-2">
        <Label htmlFor="grayscale" className="cursor-pointer flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Grayscale Mode
        </Label>
        <Switch
          id="grayscale"
          checked={settings.grayscale}
          onCheckedChange={(checked) => {
            updateSettings({ grayscale: checked });
            announceToScreenReader(checked ? 'Grayscale enabled' : 'Grayscale disabled');
          }}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="hide-images" className="cursor-pointer flex items-center gap-2">
          <ImageOff className="h-4 w-4" />
          Hide Images
        </Label>
        <Switch
          id="hide-images"
          checked={settings.hideImages}
          onCheckedChange={(checked) => {
            updateSettings({ hideImages: checked });
            announceToScreenReader(checked ? 'Images hidden' : 'Images shown');
          }}
        />
      </div>
    </div>
  );
}
