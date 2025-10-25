import { useNavigate } from "react-router-dom";
import { Sparkles, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";

interface DiscoverMilestoneCardProps {
  totalRated: number;
  onDismiss: () => void;
}

export const DiscoverMilestoneCard = ({ totalRated, onDismiss }: DiscoverMilestoneCardProps) => {
  const navigate = useNavigate();

  if (totalRated <= 10) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="absolute top-20 left-4 right-4 z-40"
    >
      <Card className="bg-gradient-to-br from-primary/95 to-primary/80 backdrop-blur-md border-primary/20 p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 bg-white/20 rounded-full p-2">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="text-white font-semibold text-sm mb-1">
                Great progress! You've rated {totalRated} movies 🎉
              </h3>
              <p className="text-white/90 text-xs leading-relaxed">
                Your personalized recommendations are ready on the home page. Keep rating to make them even better!
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => navigate("/")}
                className="text-xs font-semibold"
              >
                <Home className="h-3.5 w-3.5 mr-1.5" />
                View Recommendations
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onDismiss}
                className="text-xs text-white hover:bg-white/20"
              >
                Keep Rating
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};
