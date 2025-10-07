import { Badge } from "@/components/ui/badge";
import { Shield, User } from "lucide-react";

interface RoleBadgeProps {
  role: string;
}

export const RoleBadge = ({ role }: RoleBadgeProps) => {
  const roleConfig: Record<string, { variant: any; icon: any; label: string }> = {
    admin: {
      variant: "destructive",
      icon: Shield,
      label: "Admin"
    },
    user: {
      variant: "secondary",
      icon: User,
      label: "User"
    },
    moderator: {
      variant: "default",
      icon: Shield,
      label: "Moderator"
    }
  };

  const config = roleConfig[role] || roleConfig.user;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};
