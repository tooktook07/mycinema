import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Wizard from "@/pages/Wizard";

interface WizardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const WizardModal = ({ open, onOpenChange }: WizardModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl w-full h-[95vh] p-0 overflow-hidden">
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4 z-50"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-4 w-4" />
        </Button>
        <div className="h-full overflow-y-auto">
          <Wizard isModal onClose={() => onOpenChange(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
};
