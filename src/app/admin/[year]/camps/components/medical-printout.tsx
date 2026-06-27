import { forwardRef } from "react";
import type { CampPrintRegistration } from "../actions";
import { PrintField } from "./print-field";
import {
  camperName,
  formatBoolean,
  formatDate,
  formatRelationship,
} from "./print-utils";

type MedicalPrintoutProps = {
  data: CampPrintRegistration[];
};

export const MedicalPrintout = forwardRef<HTMLDivElement, MedicalPrintoutProps>(
  ({ data }, ref) => {
    return (
      <div ref={ref} className="w-[8.5in] bg-white p-0 text-black">
        {data.map((registration) => {
          const medical = registration.medicalInfo;

          return (
            <div
              key={registration.id}
              className="camp-print-page-break box-border flex min-h-[11in] w-full flex-col gap-4 py-[0.4in] pr-[0.4in] pl-[0.65in] text-sm"
            >
              <h2 className="px-5 text-2xl font-bold">
                {camperName(registration)}
              </h2>

              <div className="flex w-full gap-4 px-2">
                <div className="flex w-1/3 flex-col gap-1 px-1">
                  <PrintField
                    label="Birthdate"
                    content={formatDate(registration.camper.dateOfBirth)}
                  />
                  <PrintField
                    label="Gender"
                    content={registration.camper.gender}
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <PrintField
                    label="Camp"
                    content={registration.campName}
                    columnWidth="170px"
                  />
                  <PrintField
                    label="Swimming Level"
                    content={registration.camper.swimmingLevel}
                    columnWidth="170px"
                  />
                  <PrintField
                    label="Has Been to Camp"
                    content={formatBoolean(registration.camper.hasBeenToCamp)}
                    columnWidth="170px"
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

              <div className="flex flex-col gap-4 px-5">
                <h2 className="font-semibold">Medical Summary</h2>
                {medical ? (
                  <>
                    <div className="flex flex-row gap-8">
                      <div className="flex flex-col gap-1">
                        <PrintField
                          label="Health Care #"
                          content={medical.healthCareNumber}
                          columnWidth="150px"
                        />
                        <PrintField
                          label="Family Doctor"
                          content={`${medical.familyDoctor} (${medical.doctorPhone})`}
                          columnWidth="150px"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <PrintField
                          label="Height"
                          content={medical.height}
                          columnWidth="80px"
                        />
                        <PrintField
                          label="Weight"
                          content={medical.weight}
                          columnWidth="80px"
                        />
                      </div>
                    </div>

                    <PrintField
                      label="Allergies"
                      content={
                        medical.hasAllergies ? medical.allergiesDetails : "No"
                      }
                      stacked
                    />
                    <PrintField
                      label="EpiPen"
                      content={formatBoolean(medical.usesEpiPen)}
                      stacked
                    />
                    <PrintField
                      label="Medical Conditions"
                      content={
                        medical.hasMedicalConditions
                          ? medical.medicalConditionsDetails
                          : "No"
                      }
                      stacked
                    />
                    <PrintField
                      label="Medications At Camp"
                      content={
                        medical.hasMedicationsAtCamp
                          ? medical.medicationsAtCampDetails
                          : "No"
                      }
                      stacked
                    />
                    <PrintField
                      label="Regular Medications Not Taking At Camp"
                      content={
                        medical.hasMedicationsNotAtCamp
                          ? medical.medicationsNotAtCampDetails
                          : "No"
                      }
                      stacked
                    />
                    <PrintField
                      label="Allowed Over-the-Counter Medications"
                      content={medical.otcPermissions?.join(", ")}
                      stacked
                    />
                    <PrintField
                      label="Dietary Restrictions"
                      content={
                        registration.camper.dietaryRestrictions || "None"
                      }
                      stacked
                    />
                    <PrintField
                      label="Other"
                      content={
                        medical.additionalInfo ||
                        registration.details?.additionalInfo
                      }
                      stacked
                    />
                  </>
                ) : (
                  <p>No medical information found.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  },
);

MedicalPrintout.displayName = "MedicalPrintout";
