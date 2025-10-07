import { Badge } from "@/components/ui/badge";
import { Crown, UserCircle } from "lucide-react";

interface SubscriptionBadgeProps {
  tier: string;
  status?: string;
}

export const SubscriptionBadge = ({ tier, status = 'active' }: SubscriptionBadgeProps) => {
  const isActive = status === 'active';
  
  if (tier === 'pro') {
    return (
      <Badge variant={isActive ? "default" : "outline"} className="gap-1">
        <Crown className="h-3 w-3" />
        Pro {!isActive && `(${status})`}
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="gap-1">
      <UserCircle className="h-3 w-3" />
      Free
    </Badge>
  );
};
