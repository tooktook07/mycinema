import { Dialog, DialogContent } from "@/components/ui/dialog";
import Wizard from "@/pages/Wizard";

interface WizardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const WizardModal = ({ open, onOpenChange }: WizardModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] lg:max-w-7xl w-full h-[95vh] p-0 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <Wizard isModal onClose={() => onOpenChange(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
};
