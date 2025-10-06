import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import WizardContent from "@/pages/Wizard";

interface WizardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const WizardModal = ({ open, onOpenChange }: WizardModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full h-screen w-screen p-0 gap-0 border-0">
        {/* Close Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-50 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background/90"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-5 w-5" />
        </Button>

        {/* Wizard Content */}
        <div className="h-full w-full overflow-y-auto">
          <WizardContent isModal={true} onClose={() => onOpenChange(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
};
