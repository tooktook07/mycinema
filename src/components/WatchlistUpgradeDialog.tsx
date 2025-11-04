import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, X } from "lucide-react";
import { motion } from "framer-motion";

interface WatchlistUpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const WatchlistUpgradeDialog = ({ open, onOpenChange }: WatchlistUpgradeDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed inset-0 z-[100] w-full h-full max-w-none max-h-none p-0 gap-0 border-0 bg-transparent [&>button]:hidden">
        <div className="flex justify-center items-center min-h-screen bg-black z-[100]">
          <div className="relative h-screen w-full max-w-md overflow-hidden bg-black">
            <div className="absolute inset-0">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-[100] flex items-center justify-center bg-black p-6"
                onClick={onOpenChange ? () => onOpenChange(false) : undefined}
              >
              <div className="relative w-full h-full flex items-center justify-center">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onOpenChange(false)}
                  className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 text-white hover:bg-white/20 z-10"
                >
                  <X className="h-5 w-5" />
                </Button>

                <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black w-full h-full flex flex-col items-center justify-center text-center space-y-6 p-8">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    className="mx-auto w-20 h-20 rounded-full bg-primary/20 backdrop-blur-md flex items-center justify-center"
                  >
                    <Crown className="h-10 w-10 text-primary" />
                  </motion.div>

                  <div className="space-y-2">
                    <motion.h2
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-3xl font-bold text-white"
                    >
                      Watchlist Full! 👑
                    </motion.h2>
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="text-white/90 text-lg"
                    >
                      You've saved <span className="font-bold">10/10 movies</span>
                    </motion.p>
                  </div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-primary/10 backdrop-blur-md rounded-xl p-4 space-y-2 border border-primary/20 max-w-md w-full"
                  >
                    <div className="flex items-center justify-center gap-2 text-white">
                      <p className="text-sm font-medium">Upgrade to Pro for unlimited watchlist!</p>
                    </div>
                    <p className="text-white/70 text-xs">
                      Coming soon: Save unlimited movies and unlock premium features
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="flex flex-col gap-3 pt-2 max-w-md w-full"
                  >
                    <Button
                      disabled
                      size="lg"
                      className="w-full text-base font-semibold"
                    >
                      <Crown className="h-5 w-5 mr-2" />
                      Upgrade to Pro (Coming Soon)
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                      className="w-full bg-background text-foreground hover:bg-accent hover:text-accent-foreground border-border text-base"
                    >
                      Continue with Free Plan
                    </Button>
                  </motion.div>
                </div>
              </div>
            </motion.div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
