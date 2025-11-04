import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Bookmark, X } from "lucide-react";
import { motion } from "framer-motion";

interface WatchlistLoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const WatchlistLoginDialog = ({ open, onOpenChange }: WatchlistLoginDialogProps) => {
  const navigate = useNavigate();

  const handleSignUp = () => {
    onOpenChange(false);
    navigate('/signup');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-full max-w-none max-h-none p-0 gap-0 border-0 bg-transparent">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 flex items-center justify-center bg-black/95 p-6"
          onClick={() => onOpenChange(false)}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ delay: 0.1 }}
            className="relative w-full max-w-lg flex flex-col items-center text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="absolute -top-2 right-0 h-10 w-10 rounded-full bg-white/10 text-white hover:bg-white/20 z-10"
            >
              <X className="h-5 w-5" />
            </Button>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto w-24 h-24 rounded-full bg-[#6B7045] flex items-center justify-center mb-6"
            >
              <Bookmark className="h-12 w-12 text-[#F4C430]" />
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl md:text-4xl font-bold text-white mb-4"
            >
              Save Your Favorites! 🎬
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-white/90 text-lg mb-6"
            >
              Create a free account to unlock your watchlist
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-[#6B7045]/20 backdrop-blur-md rounded-xl p-6 space-y-2 border border-[#6B7045]/40 w-full mb-6"
            >
              <p className="text-white font-medium text-base">
                Unlock personalized recommendations!
              </p>
              <p className="text-white/70 text-sm">
                The more you save and rate, the better your recommendations become
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col gap-3 w-full"
            >
              <Button
                size="lg"
                onClick={handleSignUp}
                className="w-full text-base font-semibold bg-[#F4C430] text-black hover:bg-[#F4C430]/90"
              >
                <Bookmark className="h-5 w-5 mr-2" />
                Create Free Account
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-full bg-white text-black hover:bg-white/90 border-0 text-base font-semibold"
              >
                Maybe Later
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};
