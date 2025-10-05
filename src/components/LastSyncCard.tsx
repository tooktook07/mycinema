import { Calendar, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Link } from "react-router-dom";

interface LastSyncCardProps {
  lastSync: {
    created_at: string;
    imported: number;
    updated: number;
  } | null;
  isAdmin: boolean;
}

export const LastSyncCard = ({ lastSync, isAdmin }: LastSyncCardProps) => {
  const cardContent = (
    <>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Last Sync</CardTitle>
        <Calendar className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {lastSync ? format(new Date(lastSync.created_at), "MMM d") : "Never"}
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          {isAdmin ? (
            <>
              Manage syncs <ArrowRight className="h-3 w-3" />
            </>
          ) : (
            lastSync ? `${lastSync.imported + lastSync.updated} changes` : "No syncs yet"
          )}
        </p>
      </CardContent>
    </>
  );

  if (isAdmin) {
    return (
      <Link to="/account">
        <Card className="cursor-pointer transition-all hover:shadow-lg hover:scale-105">
          {cardContent}
        </Card>
      </Link>
    );
  }

  return <Card>{cardContent}</Card>;
};
