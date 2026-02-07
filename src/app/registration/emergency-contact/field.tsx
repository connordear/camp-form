"use client";

import { Minus, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CollapsibleFormCard } from "@/components/forms/collapsible-form-card";
import { StaticFormStatusBadge } from "@/components/forms/form-status-badge";
import { Button } from "@/components/ui/button";
import { CardContent, CardFooter } from "@/components/ui/card";
import { useUnsavedChangesWarning } from "@/hooks/use-unsaved-changes-warning";
import { RELATIONSHIP_OPTIONS } from "@/lib/data/schema";
import { saveCamperEmergencyContacts } from "./actions";
import type { OpenContactModalArgs } from "./form";
import type {
  CamperWithEmergencyContacts,
  EmergencyContact,
  EmergencyContactFormValues,
} from "./schema";

type EmergencyContactFieldProps = {
  data: CamperWithEmergencyContacts;
  allContacts: EmergencyContact[];
  openContactModal: (args: OpenContactModalArgs) => void;
};

function getRelationshipDisplay(contact: EmergencyContact): string {
  if (contact.relationship === "other" && contact.relationshipOther) {
    return contact.relationshipOther;
  }
  const option = RELATIONSHIP_OPTIONS.find(
    (r) => r.value === contact.relationship,
  );
  return option?.name ?? contact.relationship;
}

export default function EmergencyContactField({
  data,
  allContacts,
  openContactModal,
}: EmergencyContactFieldProps) {
  const { camper, emergencyContacts: assignedContacts } = data;

  // Track selected contact IDs locally
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>(
    assignedContacts.map((c) => c.id),
  );
  const [isSaving, setIsSaving] = useState(false);

  // Derive status from current state
  const savedContactIds = assignedContacts.map((c) => c.id);
  const isDirty =
    selectedContactIds.length !== savedContactIds.length ||
    selectedContactIds.some((id) => !savedContactIds.includes(id));
  const isValid = selectedContactIds.length >= 2;

  useUnsavedChangesWarning(() => isDirty);

  const status = isSaving
    ? "submitting"
    : isDirty
      ? "unsaved"
      : isValid
        ? "complete"
        : "draft";

  // Get contacts that are selected
  const selectedContacts = selectedContactIds
    .map((id) => allContacts.find((c) => c.id === id))
    .filter((c): c is EmergencyContact => c !== undefined);

  // Get contacts available to add (not already selected)
  const availableContacts = allContacts.filter(
    (c) => !selectedContactIds.includes(c.id),
  );

  const handleAddContact = (contactId: string) => {
    if (selectedContactIds.length >= 4) {
      toast.error("Maximum 4 emergency contacts allowed");
      return;
    }
    setSelectedContactIds([...selectedContactIds, contactId]);
  };

  const handleRemoveContact = (contactId: string) => {
    setSelectedContactIds(selectedContactIds.filter((id) => id !== contactId));
  };

  const handleSave = async () => {
    if (selectedContactIds.length < 2) {
      toast.error("Please assign at least 2 emergency contacts");
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading("Saving emergency contacts...");

    try {
      await saveCamperEmergencyContacts(camper.id, selectedContactIds);
      toast.success(`Saved contacts for ${camper.firstName}`, { id: toastId });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save contacts",
        { id: toastId },
      );
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditContact = (contact: EmergencyContact) => {
    const formValues: EmergencyContactFormValues = {
      id: contact.id,
      name: contact.name,
      phone: contact.phone,
      email: contact.email ?? "",
      relationship: contact.relationship,
      relationshipOther: contact.relationshipOther ?? "",
    };
    openContactModal({ contact: formValues });
  };

  const title = `Emergency Contacts - ${camper.firstName} ${camper.lastName}`;
  const isComplete = status === "complete";

  return (
    <CollapsibleFormCard
      title={title}
      statusBadge={<StaticFormStatusBadge status={status} />}
      isComplete={isComplete}
      isDirty={isDirty}
    >
      <CardContent className="space-y-4">
        {/* Assigned Contacts List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Assigned Contacts</p>
            {selectedContactIds.length < 2 && (
              <p className="text-xs text-muted-foreground">
                {2 - selectedContactIds.length} more needed
              </p>
            )}
            {selectedContactIds.length >= 4 && (
              <p className="text-xs text-muted-foreground">Maximum reached</p>
            )}
          </div>

          {selectedContacts.length === 0 ? (
            <p className="text-sm text-muted-foreground italic py-2">
              No contacts assigned yet
            </p>
          ) : (
            <div className="space-y-2">
              {selectedContacts.map((contact, index) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between p-3 border rounded-md bg-muted/30"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        #{index + 1}
                      </span>
                      <span className="font-medium truncate">
                        {contact.name}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {contact.phone} ({getRelationshipDisplay(contact)})
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEditContact(contact)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleRemoveContact(contact.id)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Contact Section */}
        {selectedContactIds.length < 4 && (
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Add Contact</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  openContactModal({
                    onContactCreated: (contactId) => {
                      if (selectedContactIds.length >= 4) {
                        toast.warning(
                          "Contact created but not auto-assigned - maximum contacts reached",
                        );
                        return;
                      }
                      setSelectedContactIds((prev) => [...prev, contactId]);
                    },
                  })
                }
              >
                <Plus className="h-4 w-4 mr-1" />
                New Contact
              </Button>
            </div>

            {availableContacts.length > 0 ? (
              <div className="space-y-1">
                {availableContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between p-2 border rounded-md"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{contact.name}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        ({getRelationshipDisplay(contact)})
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEditContact(contact)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleAddContact(contact.id)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                {allContacts.length === 0
                  ? "No contacts created yet. Click 'New Contact' to create one."
                  : "All contacts are already assigned."}
              </p>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Button
          onClick={handleSave}
          disabled={isSaving || selectedContactIds.length < 2}
          className="w-full"
        >
          {isSaving ? "Saving..." : "Save Emergency Contacts"}
        </Button>
      </CardFooter>
    </CollapsibleFormCard>
  );
}
