import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";
import { Moon, Sun, Monitor, Accessibility, Database, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

export const GeneralSettings = () => {
  const { theme, setTheme } = useTheme();
  const { user, isAdmin } = useAuth();
  const [accessibilityWidgetEnabled, setAccessibilityWidgetEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [setupLoading, setSetupLoading] = useState(false);
  const [serviceKeyInfo, setServiceKeyInfo] = useState<{ updatedAt: string } | null>(null);

  useEffect(() => {
    fetchSettings();
    if (isAdmin) {
      fetchServiceKeyInfo();
    }
  }, [isAdmin]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'accessibility_widget_enabled')
        .maybeSingle();

      if (error) {
        console.warn('Could not fetch settings:', error.message);
        return;
      }
      
      if (data) {
        setAccessibilityWidgetEnabled(data.value === true);
      }
    } catch (error: any) {
      console.warn('Error fetching settings:', error?.message || 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchServiceKeyInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('updated_at')
        .eq('key', 'service_role_key')
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setServiceKeyInfo({ updatedAt: data.updated_at });
      }
    } catch (error) {
      console.error('Error fetching service key info:', error);
    }
  };

  const handleSetupServiceKey = async () => {
    setSetupLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('setup-service-key');
      
      if (error) throw error;
      
      toast.success('Service key configured successfully! Automated pipelines will now work.');
      await fetchServiceKeyInfo();
    } catch (error: any) {
      console.error('Error setting up service key:', error);
      toast.error('Failed to setup service key: ' + (error.message || 'Unknown error'));
    } finally {
      setSetupLoading(false);
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
          <>
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

            <div className="space-y-3 pt-4 border-t">
              <div className="space-y-1">
                <Label className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Automation Pipeline Configuration
                </Label>
                <p className="text-sm text-muted-foreground">
                  Fix automated pipelines if they're not running on schedule
                </p>
              </div>
              <Button 
                onClick={handleSetupServiceKey}
                disabled={setupLoading}
                className="w-full"
              >
                {setupLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Configuring...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4" />
                    Fix Automation Pipelines
                  </>
                )}
              </Button>
              {serviceKeyInfo && (
                <p className="text-xs text-muted-foreground">
                  Last configured: {format(new Date(serviceKeyInfo.updatedAt), 'PPpp')}
                </p>
              )}
            </div>
          </>
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
