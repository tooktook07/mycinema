import { Dialog, DialogContent } from "@/components/ui/dialog";
import DiscoverMode from "@/pages/DiscoverMode";

interface DiscoverModeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DiscoverModeModal = ({ open, onOpenChange }: DiscoverModeModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] lg:max-w-7xl w-full h-[95vh] p-0 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <DiscoverMode isModal onClose={() => onOpenChange(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
};
