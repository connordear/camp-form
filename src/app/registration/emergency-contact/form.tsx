"use client";

import { useMemo, useState } from "react";
import ContactModal from "./contact-modal";
import EmergencyContactField from "./field";
import type {
  CamperWithEmergencyContacts,
  EmergencyContact,
  EmergencyContactFormValues,
} from "./schema";

type EmergencyContactFormProps = {
  campers: CamperWithEmergencyContacts[];
  allContacts: EmergencyContact[];
};

export type OpenContactModalArgs = {
  contact?: EmergencyContactFormValues;
  onContactCreated?: (contactId: string) => void;
};

export default function EmergencyContactForm({
  campers,
  allContacts,
}: EmergencyContactFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentContact, setCurrentContact] =
    useState<EmergencyContactFormValues>();
  const [onContactCreated, setOnContactCreated] = useState<
    ((contactId: string) => void) | undefined
  >();

  // Compute which contacts are assigned to at least one camper
  const assignedContactIds = useMemo(() => {
    const ids = new Set<string>();
    for (const camperData of campers) {
      for (const contact of camperData.emergencyContacts) {
        ids.add(contact.id);
      }
    }
    return ids;
  }, [campers]);

  function openContactModal({
    contact,
    onContactCreated,
  }: OpenContactModalArgs) {
    setCurrentContact(contact);
    // Wrap in a function to store the callback properly in state
    setOnContactCreated(() => onContactCreated);
    setIsOpen(true);
  }

  const isCurrentContactAssigned = currentContact?.id
    ? assignedContactIds.has(currentContact.id)
    : false;

  return (
    <>
      <div className="flex flex-col gap-3 items-center">
        {(campers ?? []).map((data) => (
          <EmergencyContactField
            key={data.camper.id}
            data={data}
            allContacts={allContacts}
            openContactModal={openContactModal}
          />
        ))}
      </div>
      <ContactModal
        key={currentContact?.id ?? "new"}
        onOpenChange={setIsOpen}
        isOpen={isOpen}
        contact={currentContact}
        onContactCreated={onContactCreated}
        isAssignedToCamper={isCurrentContactAssigned}
      />
    </>
  );
}
