import { format } from "date-fns";
import { and, eq } from "drizzle-orm";
import {
  AlertCircle,
  Heart,
  Pill,
  Scale,
  Shield,
  Syringe,
  User,
} from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { getSession, hasMedicalAccess } from "@/lib/auth-helpers";
import { db } from "@/lib/data/db";
import { registrations } from "@/lib/data/schema";

interface HealthcarePrintPageProps {
  params: Promise<{ year: string; id: string }>;
}

function formatDate(dateStr: string | Date): string {
  return format(new Date(dateStr), "MMM d, yyyy");
}

export default async function HealthcarePrintPage({
  params,
}: HealthcarePrintPageProps) {
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  // Only admin and HCP can access healthcare forms
  if (!hasMedicalAccess(session.user.role)) {
    redirect("/");
  }

  const { year: yearParam, id: registrationId } = await params;
  const year = parseInt(yearParam, 10);

  if (Number.isNaN(year)) {
    notFound();
  }

  const registration = await db.query.registrations.findFirst({
    where: and(
      eq(registrations.id, registrationId),
      eq(registrations.campYear, year),
    ),
    with: {
      camper: {
        with: {
          medicalInfo: true,
        },
      },
      campYear: {
        with: {
          camp: true,
        },
      },
    },
  });

  if (!registration) {
    notFound();
  }

  const { camper } = registration;
  const medicalInfo = camper.medicalInfo;

  return (
    <>
      <style jsx global>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
          .print-container {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
        }
      `}</style>
      <div className="print-container min-h-screen bg-white p-8 max-w-4xl mx-auto">
        <div className="no-print mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Healthcare Form</h1>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
          >
            Print
          </button>
        </div>

        <div className="space-y-6">
          <div className="text-center border-b pb-4">
            <h1 className="text-3xl font-bold">
              {registration.campYear.camp.name}
            </h1>
            <p className="text-lg text-muted-foreground">
              Healthcare Information - {registration.campYear.year}
            </p>
          </div>

          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">
                {camper.firstName} {camper.lastName}
              </h2>
              <p className="text-muted-foreground">
                Date of Birth: {formatDate(camper.dateOfBirth)}
              </p>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <p>Printed: {formatDate(new Date())}</p>
              <p>Registration ID: {registration.id.slice(0, 8)}</p>
            </div>
          </div>

          <Separator />

          {!medicalInfo ? (
            <div className="flex items-center gap-2 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <AlertCircle className="size-5 text-yellow-600" />
              <p className="text-yellow-800">
                No medical information on file for this camper.
              </p>
            </div>
          ) : (
            <>
              <section>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Heart className="size-5" />
                  General Health Information
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Healthcare Number
                    </p>
                    <p className="font-medium">
                      {medicalInfo.healthCareNumber || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Family Doctor
                    </p>
                    <p className="font-medium">
                      {medicalInfo.familyDoctor || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Doctor Phone
                    </p>
                    <p className="font-medium">
                      {medicalInfo.doctorPhone || "N/A"}
                    </p>
                  </div>
                  {medicalInfo.height && (
                    <div>
                      <p className="text-sm text-muted-foreground">Height</p>
                      <p className="font-medium">{medicalInfo.height}</p>
                    </div>
                  )}
                  {medicalInfo.weight && (
                    <div>
                      <p className="text-sm text-muted-foreground">Weight</p>
                      <p className="font-medium">{medicalInfo.weight}</p>
                    </div>
                  )}
                </div>
              </section>

              <Separator />
              <section>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <AlertCircle className="size-5" />
                  Allergies
                </h3>
                <div className="p-4 bg-gray-50 rounded-md">
                  {medicalInfo.hasAllergies ? (
                    <div>
                      <p className="font-medium">
                        Yes - {medicalInfo.allergiesDetails || "Details not provided"}
                      </p>
                      {medicalInfo.usesEpiPen && (
                        <p className="text-sm text-red-600 mt-2 font-medium">
                          ⚠️ Requires EpiPen at camp
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="font-medium">No known allergies</p>
                  )}
                </div>
              </section>

              <Separator />
              <section>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Pill className="size-5" />
                  Medications
                </h3>
                <div className="space-y-3">
                  <div className="p-4 bg-gray-50 rounded-md">
                    <p className="text-sm text-muted-foreground mb-1">
                      Medications at Camp
                    </p>
                    {medicalInfo.hasMedicationsAtCamp ? (
                      <p className="font-medium">
                        {medicalInfo.medicationsAtCampDetails ||
                          "Yes, but details not provided"}
                      </p>
                    ) : (
                      <p className="font-medium">No</p>
                    )}
                  </div>
                  <div className="p-4 bg-gray-50 rounded-md">
                    <p className="text-sm text-muted-foreground mb-1">
                      Medications NOT at Camp (may need during day)
                    </p>
                    {medicalInfo.hasMedicationsNotAtCamp ? (
                      <p className="font-medium">
                        {medicalInfo.medicationsNotAtCampDetails ||
                          "Yes, but details not provided"}
                      </p>
                    ) : (
                      <p className="font-medium">No</p>
                    )}
                  </div>
                  {medicalInfo.otcPermissions &&
                    medicalInfo.otcPermissions.length > 0 && (
                      <div className="p-4 bg-gray-50 rounded-md">
                        <p className="text-sm text-muted-foreground mb-1">
                          OTC Medication Permissions
                        </p>
                        <p className="font-medium">
                          {medicalInfo.otcPermissions.join(", ")}
                        </p>
                      </div>
                    )}
                </div>
              </section>

              <Separator />
              <section>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Syringe className="size-5" />
                  Medical Conditions
                </h3>
                <div className="p-4 bg-gray-50 rounded-md">
                  {medicalInfo.hasMedicalConditions ? (
                    <p className="font-medium">
                      {medicalInfo.medicalConditionsDetails ||
                        "Yes, but details not provided"}
                    </p>
                  ) : (
                    <p className="font-medium">No known medical conditions</p>
                  )}
                </div>
              </section>

              {medicalInfo.additionalInfo && (
                <>
                  <Separator />
                  <section>
                    <h3 className="text-lg font-semibold mb-3">
                      Additional Medical Information
                    </h3>
                    <div className="p-4 bg-gray-50 rounded-md">
                      <p className="whitespace-pre-wrap">
                        {medicalInfo.additionalInfo}
                      </p>
                    </div>
                  </section>
                </>
              )}
            </>
          )}

          <div className="mt-8 pt-8 border-t">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-sm text-muted-foreground mb-8">
                  Parent/Guardian Signature
                </p>
                <div className="border-b border-gray-400 h-8"></div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-8">Date</p>
                <div className="border-b border-gray-400 h-8"></div>
              </div>
            </div>
          </div>

          <div className="mt-4 text-center text-xs text-muted-foreground">
            <p>
              This document contains confidential medical information.
              Handle in accordance with privacy regulations.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
