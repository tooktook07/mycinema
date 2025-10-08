import { useDevMode } from '@/contexts/DevModeContext';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Code2, User, Shield, Users, Clock, Trash2, TestTube } from 'lucide-react';
import { cn } from '@/lib/utils';
import { addFakeTrackingData, getTrackingDebugInfo, clearAllTracking } from '@/lib/trackingDebug';
import { canClearOlderEntries } from '@/lib/recentlyShownTracker';
import { useState } from 'react';
import { toast } from 'sonner';

export const DevModeSwitcher = () => {
  const { devMode, setDevMode } = useDevMode();
  const [trackingInfo, setTrackingInfo] = useState(getTrackingDebugInfo());

  const modes = [
    { value: 'off' as const, label: 'Dev Mode Off', icon: Code2, description: 'Use real auth state' },
    { value: 'visitor' as const, label: 'Visitor', icon: Users, description: 'Not logged in' },
    { value: 'user' as const, label: 'User', icon: User, description: 'Regular user' },
    { value: 'admin' as const, label: 'Admin', icon: Shield, description: 'Admin privileges' },
  ];

  const currentMode = modes.find(m => m.value === devMode) || modes[0];
  const Icon = currentMode.icon;

  const refreshTrackingInfo = () => {
    setTrackingInfo(getTrackingDebugInfo());
  };

  const handleAddTestData = (hours: number) => {
    addFakeTrackingData(hours);
    refreshTrackingInfo();
    toast.success(`Added test data (${hours}h old)`);
  };

  const handleClearTracking = () => {
    clearAllTracking();
    refreshTrackingInfo();
    toast.success('Tracking cleared');
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-2 border-dashed",
            devMode !== 'off' && "border-primary bg-primary/5"
          )}
        >
          <Icon className="h-4 w-4" />
          <span className="hidden sm:inline">{currentMode.label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          {/* Dev Mode Section */}
          <div className="space-y-2">
            <div className="text-sm font-semibold">Development Mode</div>
            {modes.map((mode) => {
              const ModeIcon = mode.icon;
              return (
                <Button
                  key={mode.value}
                  variant={devMode === mode.value ? "default" : "ghost"}
                  className="w-full justify-start gap-2"
                  onClick={() => setDevMode(mode.value)}
                >
                  <ModeIcon className="h-4 w-4" />
                  <div className="flex-1 text-left">
                    <div className="text-sm">{mode.label}</div>
                    <div className="text-xs opacity-60">{mode.description}</div>
                  </div>
                </Button>
              );
            })}
          </div>

          <Separator />

          {/* Tracking Debug Section */}
          <div className="space-y-2">
            <div className="text-sm font-semibold">Tracking Debug</div>
            
            {/* Stats */}
            <div className="text-xs space-y-1 p-2 bg-muted/50 rounded">
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3" />
                <span>
                  {trackingInfo.count} movies tracked
                  {trackingInfo.oldestHours !== null && ` (oldest: ${trackingInfo.oldestHours}h ago)`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {canClearOlderEntries() ? (
                  <span className="text-green-600">✅ Refresh button would show</span>
                ) : (
                  <span className="text-muted-foreground">❌ Need entries 6h+ old</span>
                )}
              </div>
            </div>

            {/* Test Data Buttons */}
            <div className="space-y-1">
              <Button
                onClick={() => handleAddTestData(7)}
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
              >
                <TestTube className="h-3 w-3" />
                Add Test Data (7h old)
              </Button>
              <Button
                onClick={() => handleAddTestData(1)}
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
              >
                <TestTube className="h-3 w-3" />
                Add Test Data (1h old)
              </Button>
              <Button
                onClick={handleClearTracking}
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
              >
                <Trash2 className="h-3 w-3" />
                Clear All Tracking
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
