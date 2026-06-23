"use client";

import { CopyIcon, Loader2Icon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { RegistrationRow } from "../actions";
import { getCampRegistrations } from "../actions";
import type { AdminRegistration } from "../../registrations/schema";
import { RegistrationModal } from "../../registrations/components/registration-modal";

interface CampRegistrationsDialogProps {
  camp: { id: string; name: string };
  year: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  registered: "Registered",
  refunded: "Refunded",
};

const STATUS_ORDER = ["registered", "draft", "refunded"];

export function CampRegistrationsDialog({
  camp,
  year,
  open,
  onOpenChange,
}: CampRegistrationsDialogProps) {
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(true);
      getCampRegistrations({ campId: camp.id, year })
        .then(setRegistrations)
        .catch((err) => {
          toast.error("Failed to load registrations");
          console.error(err);
        })
        .finally(() => setLoading(false));
    }
  }, [open, camp.id, year]);

  const grouped = registrations.reduce(
    (acc, reg) => {
      const key = reg.status;
      if (!acc[key]) acc[key] = [];
      acc[key].push(reg);
      return acc;
    },
    {} as Record<string, RegistrationRow[]>,
  );

  const copyEmails = useCallback((emails: string[]) => {
    navigator.clipboard.writeText(emails.join("\n")).then(
      () => toast.success("Emails copied to clipboard"),
      () => toast.error("Failed to copy emails"),
    );
  }, []);

  const [selectedReg, setSelectedReg] = useState<AdminRegistration | null>(null);

  const formatPrice = (pricePaid: number | null) => {
    if (pricePaid == null) return "-";
    return `$${(pricePaid / 100).toFixed(2)}`;
  };

  const buildAdminRegistration = (row: RegistrationRow): AdminRegistration =>
    ({
      id: row.id,
      campId: row.campId,
      priceId: "",
      camperId: row.camperId,
      numDays: null,
      pricePaid: row.pricePaid,
      status: row.status,
      stripePaymentIntentId: null,
      stripeSessionId: null,
      createdAt: row.createdAt,
      updatedAt: row.createdAt,
      campYear: { year: row.campYear, campId: row.campId },
      camper: {
        id: row.camperId,
        firstName: row.camperFirstName,
        lastName: row.camperLastName,
        userId: "",
      },
      price: row.priceName
        ? { id: "", name: row.priceName, price: 0 }
        : null,
    }) as unknown as AdminRegistration;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{camp.name} — Registrations</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 -mx-6 px-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : registrations.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No registrations found.
            </p>
          ) : (
            STATUS_ORDER.map((status) => {
              const group = grouped[status];
              if (!group || group.length === 0) return null;
              const emails = group.map((r) => r.camperEmail);
              return (
                <div key={status} className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold">
                      {STATUS_LABELS[status]} ({group.length})
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyEmails(emails)}
                    >
                      <CopyIcon className="size-3.5 mr-1.5" />
                      Copy Emails
                    </Button>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Camper Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Price Paid</TableHead>
                        <TableHead>Registered Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.map((reg) => (
                        <TableRow
                          key={reg.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() =>
                            setSelectedReg(buildAdminRegistration(reg))
                          }
                        >
                          <TableCell className="font-medium">
                            {reg.camperFirstName} {reg.camperLastName}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {reg.camperEmail}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {STATUS_LABELS[reg.status]}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatPrice(reg.pricePaid)}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(reg.createdAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>

      <RegistrationModal
        registration={selectedReg}
        userRole="admin"
        onClose={() => setSelectedReg(null)}
        onRefresh={() => {}}
      />
    </Dialog>
  );
}
