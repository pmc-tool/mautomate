import { AlertCircle, ArrowUpRight, Coins } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface InsufficientCreditsModalProps {
  open: boolean;
  onClose: () => void;
  required?: number;
  available?: number;
}

export function InsufficientCreditsModal({
  open,
  onClose,
  required,
  available,
}: InsufficientCreditsModalProps) {
  const navigate = useNavigate();

  const shortfall =
    required !== undefined && available !== undefined
      ? required - available
      : undefined;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <DialogTitle className="text-center">
            Insufficient Credits
          </DialogTitle>
          <DialogDescription className="text-center">
            You don't have enough credits to perform this action.
          </DialogDescription>
        </DialogHeader>

        {(required !== undefined || available !== undefined) && (
          <div className="my-2 flex justify-center gap-6 text-sm">
            {available !== undefined && (
              <div className="text-center">
                <p className="text-muted-foreground">Available</p>
                <p className="text-lg font-semibold">{available}</p>
              </div>
            )}
            {required !== undefined && (
              <div className="text-center">
                <p className="text-muted-foreground">Required</p>
                <p className="text-lg font-semibold">{required}</p>
              </div>
            )}
            {shortfall !== undefined && shortfall > 0 && (
              <div className="text-center">
                <p className="text-muted-foreground">Shortfall</p>
                <p className="text-lg font-semibold text-destructive">
                  {shortfall}
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex flex-col gap-2 sm:flex-col">
          <Button
            onClick={() => {
              onClose();
              navigate("/pricing");
            }}
            className="w-full"
          >
            <ArrowUpRight className="mr-2 h-4 w-4" />
            Upgrade Plan
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              onClose();
              navigate("/account");
            }}
            className="w-full"
          >
            <Coins className="mr-2 h-4 w-4" />
            Buy Credits
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
