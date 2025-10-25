import { useNavigate } from "react-router-dom";
import { Sparkles, Home, X, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-6"
      onClick={onDismiss}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ delay: 0.1 }}
        className="relative max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={onDismiss}
          className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-white/10 text-white hover:bg-white/20 z-10"
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black rounded-2xl p-8 text-center space-y-6 border border-white/10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mx-auto w-20 h-20 rounded-full bg-primary/20 backdrop-blur-md flex items-center justify-center"
          >
            <Sparkles className="h-10 w-10 text-primary" />
          </motion.div>

          <div className="space-y-2">
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-bold text-white"
            >
              Amazing Progress! 🎉
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-white/90 text-lg"
            >
              You've rated <span className="font-bold">{totalRated} movies</span>
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-primary/10 backdrop-blur-md rounded-xl p-4 space-y-2 border border-primary/20"
          >
            <div className="flex items-center justify-center gap-2 text-white">
              <TrendingUp className="h-5 w-5 text-primary" />
              <p className="text-sm font-medium">Your personalized recommendations are ready!</p>
            </div>
            <p className="text-white/70 text-xs">
              The more you rate, the better your recommendations become
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col gap-3 pt-2"
          >
            <Button
              size="lg"
              onClick={() => navigate("/")}
              className="w-full text-base font-semibold"
            >
              <Home className="h-5 w-5 mr-2" />
              View My Recommendations
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={onDismiss}
              className="w-full text-white hover:bg-white/10 border-white/20 text-base"
            >
              Continue Rating
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
};
