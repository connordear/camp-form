"use client";

import { useState } from "react";
import AddressForm from "./address-modal";
import CamperField from "./camper-field";
import type { Address, AddressFormValues, CamperInfo } from "./schema";

type CamperFormProps = {
  campers: CamperInfo[];
  addresses: Address[];
};

export default function CamperForm({ campers, addresses }: CamperFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentAddress, setCurrentAddress] = useState<AddressFormValues>();
  const [activeCamperId, setActiveCamperId] = useState<number>(0);

  function openAddressForm(camperId: number, address?: AddressFormValues) {
    setCurrentAddress(address);
    setIsOpen(true);
    setActiveCamperId(camperId);
  }
  return (
    <>
      <div className="flex flex-col gap-3">
        {(campers ?? []).map((camper) => (
          <CamperField
            key={camper.id}
            camper={camper}
            addresses={addresses}
            openAddressForm={openAddressForm}
          />
        ))}
      </div>
      <AddressForm
        key={activeCamperId}
        onOpenChange={setIsOpen}
        isOpen={isOpen}
        address={currentAddress}
      />
    </>
  );
}
