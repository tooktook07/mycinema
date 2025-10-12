import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/components/ThemeProvider";
import { Moon, Sun, Monitor, Accessibility } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export const GeneralSettings = () => {
  const { theme, setTheme } = useTheme();
  const { user, isAdmin } = useAuth();
  const [accessibilityWidgetEnabled, setAccessibilityWidgetEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'accessibility_widget_enabled')
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setAccessibilityWidgetEnabled(data.value === true);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateAccessibilityWidgetSetting = async (enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('system_settings')
        .update({ 
          value: enabled,
          updated_by: user?.id,
          updated_at: new Date().toISOString()
        })
        .eq('key', 'accessibility_widget_enabled');

      if (error) throw error;
      
      setAccessibilityWidgetEnabled(enabled);
      toast.success(`Accessibility widget ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error updating setting:', error);
      toast.error('Failed to update setting');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>General Settings</CardTitle>
        <CardDescription>Manage your account preferences and settings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="theme">Default Theme</Label>
          <Select value={theme} onValueChange={setTheme}>
            <SelectTrigger id="theme" className="w-full">
              <SelectValue placeholder="Select theme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">
                <div className="flex items-center gap-2">
                  <Sun className="h-4 w-4" />
                  <span>Light</span>
                </div>
              </SelectItem>
              <SelectItem value="dark">
                <div className="flex items-center gap-2">
                  <Moon className="h-4 w-4" />
                  <span>Dark</span>
                </div>
              </SelectItem>
              <SelectItem value="system">
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  <span>System</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Choose your preferred color scheme for the interface
          </p>
        </div>

        {isAdmin && (
          <div className="space-y-2 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="accessibility-widget" className="flex items-center gap-2">
                  <Accessibility className="h-4 w-4" />
                  Accessibility Widget
                </Label>
                <p className="text-sm text-muted-foreground">
                  Show accessibility options to all users
                </p>
              </div>
              <Switch
                id="accessibility-widget"
                checked={accessibilityWidgetEnabled}
                onCheckedChange={updateAccessibilityWidgetSetting}
                disabled={isLoading}
              />
            </div>
          </div>
        )}

        <div className="pt-4 border-t">
          <h3 className="text-lg font-semibold mb-2">About</h3>
          <p className="text-sm text-muted-foreground">
            CineMatch - Your personal movie and TV show database
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Version 1.0.0
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
