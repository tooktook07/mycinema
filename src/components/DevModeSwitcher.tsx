import { useDevMode } from '@/contexts/DevModeContext';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Code2, User, Shield, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export const DevModeSwitcher = () => {
  const { devMode, setDevMode } = useDevMode();

  const modes = [
    { value: 'off' as const, label: 'Dev Mode Off', icon: Code2, description: 'Use real auth state' },
    { value: 'visitor' as const, label: 'Visitor', icon: Users, description: 'Not logged in' },
    { value: 'user' as const, label: 'User', icon: User, description: 'Regular user' },
    { value: 'admin' as const, label: 'Admin', icon: Shield, description: 'Admin privileges' },
  ];

  const currentMode = modes.find(m => m.value === devMode) || modes[0];
  const Icon = currentMode.icon;

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
      <PopoverContent className="w-64" align="end">
        <div className="space-y-2">
          <div className="text-sm font-semibold mb-3">Development Mode</div>
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
      </PopoverContent>
    </Popover>
  );
};
