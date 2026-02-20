"use client";

import { format } from "date-fns";
import {
  AlertTriangle,
  Calendar,
  MailIcon,
  User as UserIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import type { User, UserRole } from "@/app/admin/[year]/users/schema";
import { getRoleLabel, RoleBadge } from "@/components/role-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { updateUserRole } from "../actions";
import { ROLE_OPTIONS } from "../schema";

interface UserModalProps {
  user: User | null;
  onClose: () => void;
  year: number;
}

export function UserModal({ user, onClose, year }: UserModalProps) {
  const router = useRouter();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [confirmName, setConfirmName] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const isOpen = user !== null;

  const handleRoleChange = (newRole: UserRole) => {
    if (newRole === user?.role) return;
    setSelectedRole(newRole);
    setConfirmName("");
    setShowConfirmDialog(true);
  };

  const handleConfirmUpgrade = async () => {
    if (!user || !selectedRole) return;

    setIsUpdating(true);
    try {
      const result = await updateUserRole({
        userId: user.id,
        newRole: selectedRole,
        confirmedName: confirmName,
      });

      if (result.success) {
        toast.success("Role updated", {
          description: `${user.name} is now ${getRoleLabel(selectedRole)}`,
        });
        setShowConfirmDialog(false);
        router.refresh();
        onClose();
      } else {
        toast.error("Failed to update role", {
          description: result.error,
        });
      }
    } catch (error) {
      toast.error("Error", {
        description: "Failed to update role. Please try again.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (!user) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <UserIcon className="size-5" />
              {user.name}
            </DialogTitle>
            <DialogDescription>
              User details and role management
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Email</span>
                <div className="flex items-center gap-1 mt-1">
                  <MailIcon className="size-3" />
                  <span className="font-medium">{user.email}</span>
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Current Role</span>
                <div className="mt-1">
                  <RoleBadge role={user.role} />
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">
                  Registrations ({year})
                </span>
                <p className="font-medium mt-1">{user.registrationCount}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Registered</span>
                <div className="flex items-center gap-1 mt-1">
                  <Calendar className="size-3" />
                  <span className="font-medium">
                    {format(new Date(user.createdAt), "MMM d, yyyy")}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <Label className="text-muted-foreground text-sm">
                Change Role
              </Label>
              <Select
                value={user.role ?? "user"}
                onValueChange={(value) => handleRoleChange(value as UserRole)}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                Changing role requires name confirmation for security.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" />
              Confirm Role Change
            </DialogTitle>
            <DialogDescription>
              You are about to change{" "}
              <span className="font-semibold text-foreground">{user.name}</span>
              's role from <RoleBadge role={user.role} className="mx-1" /> to{" "}
              <RoleBadge role={selectedRole} className="mx-1" />
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="confirm-name">
                Type <span className="font-semibold">{user.name}</span> to
                confirm:
              </Label>
              <Input
                id="confirm-name"
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder={user.name}
                className="mt-2"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowConfirmDialog(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmUpgrade}
                disabled={confirmName !== user.name || isUpdating}
              >
                {isUpdating ? "Updating..." : "Confirm Change"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
