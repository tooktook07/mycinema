import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export const SyncTvShows = () => {
  const { toast } = useToast();

  const handleSyncTvShows = async () => {
    toast({
      title: "Coming Soon",
      description: "TV Shows sync functionality will be available soon.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sync TV Shows from TMDB</CardTitle>
        <CardDescription>Configure filters to sync TV show data - coming soon</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            TV Shows sync functionality is currently under development.
          </p>
          <Button
            onClick={handleSyncTvShows}
            disabled
            size="lg"
          >
            <Download className="h-4 w-4 mr-2" />
            Sync TV Shows (Coming Soon)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
