"use client";

import { createId } from "@paralleldrive/cuid2";
import { DialogTitle } from "@radix-ui/react-dialog";
import { useStore } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";
import { Field, FieldLabel, FieldSet } from "@/components/ui/field";
import { useAppForm } from "@/hooks/use-camp-form";
import { RELATIONSHIP_OPTIONS } from "@/lib/data/schema";
import { saveEmergencyContact } from "./actions";
import {
  type EmergencyContactFormValues,
  emergencyContactInsertSchema,
} from "./schema";

const defaultContactValues: EmergencyContactFormValues = {
  id: createId(),
  name: "",
  phone: "",
  email: "",
  relationship: "",
  relationshipOther: "",
};

type ContactModalProps = {
  contact?: EmergencyContactFormValues;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export default function ContactModal({
  contact,
  isOpen,
  onOpenChange,
}: ContactModalProps) {
  const isNew = !contact?.name;
  const router = useRouter();

  const form = useAppForm({
    defaultValues: contact ?? { ...defaultContactValues, id: createId() },
    validators: {
      onChange: emergencyContactInsertSchema,
    },
    onSubmit: async ({ value }) => {
      const toastId = toast.loading(
        isNew ? "Creating contact..." : "Updating contact...",
      );
      try {
        await saveEmergencyContact(value);
        toast.success(isNew ? "Contact created" : "Contact updated", {
          id: toastId,
        });
        router.refresh();
        onOpenChange(false);
      } catch (err) {
        toast.error("Failed to save contact", { id: toastId });
        console.error(err);
      }
    },
  });

  const relationshipValue = useStore(form.store, (s) => s.values.relationship);

  useEffect(() => {
    if (!isOpen) {
      form.reset();
    }
  }, [isOpen, form.reset]);

  // Reset form values when contact prop changes
  useEffect(() => {
    if (contact) {
      form.reset();
      form.setFieldValue("id", contact.id ?? createId());
      form.setFieldValue("name", contact.name ?? "");
      form.setFieldValue("phone", contact.phone ?? "");
      form.setFieldValue("email", contact.email ?? "");
      form.setFieldValue("relationship", contact.relationship ?? "");
      form.setFieldValue("relationshipOther", contact.relationshipOther ?? "");
    } else {
      form.reset();
      form.setFieldValue("id", createId());
    }
  }, [contact, form]);

  const relationshipOptions = RELATIONSHIP_OPTIONS.map((r) => ({
    value: r.value,
    name: r.name,
  }));

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80%] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {isNew ? "Add Emergency Contact" : "Edit Emergency Contact"}
          </DialogTitle>
          <DialogDescription>
            {isNew
              ? "Create a new emergency contact that can be assigned to your campers."
              : "Update this emergency contact's information."}
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col flex-1 min-h-0 overflow-hidden"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <FieldSet className="flex-1 min-h-0 overflow-y-auto">
            <form.AppField name="name">
              {(field) => (
                <Field>
                  <FieldLabel>Name</FieldLabel>
                  <field.WithErrors>
                    <field.TextInput placeholder="Contact name" />
                  </field.WithErrors>
                </Field>
              )}
            </form.AppField>

            <form.AppField name="phone">
              {(field) => (
                <Field>
                  <FieldLabel>Phone Number</FieldLabel>
                  <field.WithErrors>
                    <field.TextInput type="tel" placeholder="(555) 123-4567" />
                  </field.WithErrors>
                </Field>
              )}
            </form.AppField>

            <form.AppField name="email">
              {(field) => (
                <Field>
                  <FieldLabel>Email (optional)</FieldLabel>
                  <field.WithErrors>
                    <field.TextInput
                      type="email"
                      placeholder="email@example.com"
                    />
                  </field.WithErrors>
                </Field>
              )}
            </form.AppField>

            <form.AppField name="relationship">
              {(field) => (
                <Field>
                  <FieldLabel>Relationship</FieldLabel>
                  <field.WithErrors>
                    <field.Select
                      placeholder="Select relationship"
                      options={relationshipOptions}
                    />
                  </field.WithErrors>
                </Field>
              )}
            </form.AppField>

            {relationshipValue === "other" && (
              <form.AppField name="relationshipOther">
                {(field) => (
                  <Field>
                    <FieldLabel>Please specify relationship</FieldLabel>
                    <field.WithErrors>
                      <field.TextInput placeholder="e.g., Neighbor, Coach" />
                    </field.WithErrors>
                  </Field>
                )}
              </form.AppField>
            )}
          </FieldSet>
          <DialogFooter className="pt-3">
            <form.AppForm>
              <form.SubmitButton>
                {isNew ? "Create Contact" : "Save Changes"}
              </form.SubmitButton>
            </form.AppForm>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
