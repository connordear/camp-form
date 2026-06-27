import { forwardRef } from "react";
import type { CampPrintRegistration } from "../actions";
import { PrintField } from "./print-field";
import {
  camperName,
  formatBoolean,
  formatDate,
  formatRelationship,
  medicalSummaryVisible,
} from "./print-utils";

type RegistrationPrintoutProps = {
  data: CampPrintRegistration[];
};

export const RegistrationPrintout = forwardRef<
  HTMLDivElement,
  RegistrationPrintoutProps
>(({ data }, ref) => {
  return (
    <div
      ref={ref}
      className="box-border w-[8.5in] bg-white p-[0.4in] text-black"
    >
      {data.map((registration) => {
        const address = registration.camper.address;
        const medical = registration.medicalInfo;

        return (
          <div
            key={registration.id}
            className="camp-print-page-block mb-4 pt-[0.4in] first:pt-0"
          >
            <div className="flex w-full flex-col gap-4 border border-black p-4 text-sm">
              <div className="flex w-full gap-4">
                <div className="flex w-1/3 flex-col gap-1">
                  <PrintField label="Name" content={camperName(registration)} />
                  <PrintField
                    label="Birthdate"
                    content={formatDate(registration.camper.dateOfBirth)}
                  />
                  <PrintField
                    label="Gender"
                    content={registration.camper.gender}
                  />
                  <PrintField
                    label="Email"
                    content={registration.camper.email}
                  />
                  <PrintField
                    label="Address"
                    content={
                      address ? (
                        <div>
                          <p>{address.addressLine1}</p>
                          {address.addressLine2 && (
                            <p>{address.addressLine2}</p>
                          )}
                          <p>
                            {address.city}, {address.stateProv}{" "}
                            {address.postalZip}
                          </p>
                          <p>{address.country}</p>
                        </div>
                      ) : null
                    }
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <PrintField
                    label="Camp"
                    content={registration.campName}
                    columnWidth="150px"
                  />
                  <PrintField
                    label="Price Tier"
                    content={registration.priceName}
                    columnWidth="150px"
                  />
                  <PrintField
                    label="Swimming Level"
                    content={registration.camper.swimmingLevel}
                    columnWidth="150px"
                  />
                  <PrintField
                    label="Has Been to Camp"
                    content={formatBoolean(registration.camper.hasBeenToCamp)}
                    columnWidth="150px"
                  />
                  <PrintField
                    label="Cabin Request"
                    content={registration.details?.cabinRequest}
                    columnWidth="150px"
                  />
                  <PrintField
                    label="T-Shirt Size"
                    content={registration.camper.shirtSize}
                    columnWidth="150px"
                  />
                  <PrintField
                    label="Photos Allowed"
                    content={formatBoolean(
                      registration.camper.arePhotosAllowed,
                    )}
                    columnWidth="150px"
                  />
                  <PrintField
                    label="Signature"
                    content={registration.details?.parentSignature}
                    columnWidth="150px"
                  />
                </div>
              </div>

              <div className="px-5">
                <h2 className="mb-1 font-semibold">Emergency Contacts</h2>
                <div className="flex w-full flex-row gap-4">
                  {registration.emergencyContacts.map((contact) => (
                    <div
                      key={`${registration.id}-${contact.name}`}
                      className="flex-1"
                    >
                      <p>
                        {contact.name} (
                        {formatRelationship(
                          contact.relationship,
                          contact.relationshipOther,
                        )}
                        )
                      </p>
                      <p>{contact.phone}</p>
                      {contact.email && <p>{contact.email}</p>}
                    </div>
                  ))}
                </div>
              </div>

              {medicalSummaryVisible(registration) && (
                <div className="flex flex-col gap-3 px-5">
                  <h2 className="font-semibold">Medical Summary</h2>
                  <PrintField
                    label="Allergies"
                    content={
                      medical?.hasAllergies ? medical.allergiesDetails : null
                    }
                    stacked
                  />
                  <PrintField
                    label="Dietary Restrictions"
                    content={registration.camper.dietaryRestrictions}
                    stacked
                  />
                  <PrintField
                    label="Medical Conditions"
                    content={
                      medical?.hasMedicalConditions
                        ? medical.medicalConditionsDetails
                        : null
                    }
                    stacked
                  />
                  <PrintField
                    label="Additional Info"
                    content={
                      registration.details?.additionalInfo ||
                      medical?.additionalInfo
                    }
                    stacked
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
});

RegistrationPrintout.displayName = "RegistrationPrintout";
