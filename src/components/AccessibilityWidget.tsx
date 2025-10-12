import { useState, useEffect } from 'react';
import { Accessibility } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AccessibilityPanel } from '@/components/AccessibilityPanel';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { supabase } from '@/integrations/supabase/client';

export function AccessibilityWidget() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const { hasNonDefaultSettings } = useAccessibility();
  const location = useLocation();
  const [isEnabled, setIsEnabled] = useState(true);

  useEffect(() => {
    fetchWidgetSetting();
    
    // Subscribe to realtime changes
    const channel = supabase
      .channel('system_settings_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'system_settings',
          filter: 'key=eq.accessibility_widget_enabled'
        },
        (payload) => {
          setIsEnabled(payload.new.value === true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchWidgetSetting = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'accessibility_widget_enabled')
        .maybeSingle();

      if (error) {
        console.warn('Could not fetch widget setting:', error.message);
        return;
      }
      
      if (data) {
        setIsEnabled(data.value === true);
      }
    } catch (error: any) {
      console.warn('Error fetching widget setting:', error?.message || 'Unknown error');
      // Keep widget enabled by default if we can't fetch settings
    }
  };

  // Hide widget on specific routes or if disabled by admin
  if (!isEnabled || location.pathname === '/discover' || location.pathname === '/account') {
    return null;
  }

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
