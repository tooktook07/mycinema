import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface UserAvatarProps {
  email?: string;
  userId: string;
  className?: string;
}

export const UserAvatar = ({ email, userId, className }: UserAvatarProps) => {
  const getInitials = () => {
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return userId.substring(0, 2).toUpperCase();
  };

  return (
    <Avatar className={className}>
      <AvatarFallback className="bg-primary/10 text-primary">
        {getInitials()}
      </AvatarFallback>
    </Avatar>
  );
};
