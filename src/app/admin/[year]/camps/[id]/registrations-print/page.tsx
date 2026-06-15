import { format } from "date-fns";
import { eq } from "drizzle-orm";
import {
  AlertCircle,
  Calendar,
  Heart,
  Mail,
  MapPin,
  Phone,
  User,
} from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { AutoPrint } from "@/components/auto-print";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getSession, hasMedicalAccess } from "@/lib/auth-helpers";
import { db } from "@/lib/data/db";
import { camps } from "@/lib/data/schema";
import { capitalize } from "@/lib/utils";
import { getCampRegistrationsForPrint } from "../../actions";
import { PrintButton } from "./print-button";

const printStyles = `
  @media print {
    html, body, * {
      color: black !important;
      background: white !important;
      background-color: white !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .no-print { display: none !important; }
    .print\\:hidden { display: none !important; }
    .registration-entry { page-break-inside: avoid; break-inside: avoid; }
  }
`;

interface CampsPrintPageProps {
  params: Promise<{ year: string; id: string }>;
}

function formatDate(dateStr: string | Date): string {
  return format(new Date(dateStr), "MMM d, yyyy");
}

function getStatusBadgeVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "registered":
      return "default";
    case "draft":
      return "secondary";
    case "refunded":
      return "destructive";
    default:
      return "outline";
  }
}

export default async function CampRegistrationsPrintPage({
  params,
}: CampsPrintPageProps) {
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  const { year: yearParam, id: campId } = await params;
  const year = parseInt(yearParam, 10);

  if (Number.isNaN(year)) {
    notFound();
  }

  const canViewMedical = hasMedicalAccess(session.user.role);

  // Verify camp exists
  const camp = await db.query.camps.findFirst({
    where: eq(camps.id, campId),
  });

  if (!camp) {
    notFound();
  }

  const data = await getCampRegistrationsForPrint({ campId, year });

  return (
    <>
      <style>{printStyles}</style>
      <AutoPrint />
      <div className="print-container min-h-screen bg-white p-8 max-w-5xl mx-auto print:p-0 print:m-0 print:max-w-none">
        <div className="no-print mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold">
            {data.campName} - Registrations
          </h1>
          <PrintButton count={data.registrations.length} />
        </div>

        {data.registrations.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg">No registrations found for this camp.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {data.registrations.map((registration, index) => {
              const { camper } = registration;
              const medicalInfo = canViewMedical ? camper.medicalInfo : null;

              return (
                <div
                  key={registration.id}
                  className="registration-entry border border-gray-200 rounded-lg p-6"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h2 className="text-xl font-bold">
                        {index + 1}. {camper.firstName} {camper.lastName}
                      </h2>
                      <Badge
                        variant={getStatusBadgeVariant(registration.status)}
                        className="mt-1"
                      >
                        {capitalize(registration.status)}
                      </Badge>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p>Registered: {formatDate(registration.createdAt)}</p>
                      <p>Price Tier: {registration.price?.name || "N/A"}</p>
                    </div>
                  </div>

                  <Separator className="my-3" />

                  <section>
                    <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
                      <User className="size-4" />
                      Camper Information
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 text-sm">
                      <div>
                        <p className="text-muted-foreground">Date of Birth</p>
                        <p className="font-medium">
                          {formatDate(camper.dateOfBirth)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Gender</p>
                        <p className="font-medium capitalize">
                          {camper.gender || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Shirt Size</p>
                        <p className="font-medium">
                          {camper.shirtSize || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Swimming Level</p>
                        <p className="font-medium">
                          {camper.swimmingLevel || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Previous Camper</p>
                        <p className="font-medium">
                          {camper.hasBeenToCamp ? "Yes" : "No"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Photos Allowed</p>
                        <p className="font-medium">
                          {camper.arePhotosAllowed ? "Yes" : "No"}
                        </p>
                      </div>
                      {camper.dietaryRestrictions && (
                        <div className="col-span-2 md:col-span-3">
                          <p className="text-muted-foreground">
                            Dietary Restrictions
                          </p>
                          <p className="font-medium">
                            {camper.dietaryRestrictions}
                          </p>
                        </div>
                      )}
                    </div>
                  </section>

                  {camper.address && (
                    <>
                      <Separator className="my-3" />
                      <section>
                        <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
                          <MapPin className="size-4" />
                          Address
                        </h3>
                        <div className="text-sm">
                          <p className="font-medium">
                            {camper.address.addressLine1}
                          </p>
                          {camper.address.addressLine2 && (
                            <p className="font-medium">
                              {camper.address.addressLine2}
                            </p>
                          )}
                          <p className="font-medium">
                            {camper.address.city}, {camper.address.stateProv}{" "}
                            {camper.address.postalZip}
                          </p>
                          <p className="font-medium">
                            {camper.address.country}
                          </p>
                        </div>
                      </section>
                    </>
                  )}

                  {camper.emergencyContacts &&
                    camper.emergencyContacts.length > 0 && (
                      <>
                        <Separator className="my-3" />
                        <section>
                          <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
                            <Phone className="size-4" />
                            Emergency Contacts
                          </h3>
                          <div className="space-y-2">
                            {camper.emergencyContacts.map((contact, ci) => (
                              <div
                                key={contact.emergencyContact.id}
                                className="flex items-start justify-between p-2 bg-gray-50 rounded text-sm"
                              >
                                <div>
                                  <p className="font-medium">
                                    {ci + 1}. {contact.emergencyContact.name}
                                  </p>
                                  <div className="flex flex-wrap gap-3 text-muted-foreground mt-0.5">
                                    <span className="flex items-center gap-1">
                                      <Phone className="size-3" />
                                      {contact.emergencyContact.phone}
                                    </span>
                                    {contact.emergencyContact.email && (
                                      <span className="flex items-center gap-1">
                                        <Mail className="size-3" />
                                        {contact.emergencyContact.email}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {contact.emergencyContact.relationship ===
                                  "other"
                                    ? contact.emergencyContact
                                        .relationshipOther || "Other"
                                    : capitalize(
                                        contact.emergencyContact.relationship,
                                      )}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </section>
                      </>
                    )}

                  {medicalInfo && (
                    <>
                      <Separator className="my-3" />
                      <section>
                        <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
                          <Heart className="size-4" />
                          Medical Information
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 text-sm">
                          <div>
                            <p className="text-muted-foreground">
                              Health Care #
                            </p>
                            <p className="font-medium">
                              {medicalInfo.healthCareNumber}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">
                              Family Doctor
                            </p>
                            <p className="font-medium">
                              {medicalInfo.familyDoctor}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">
                              Doctor Phone
                            </p>
                            <p className="font-medium">
                              {medicalInfo.doctorPhone}
                            </p>
                          </div>
                          {medicalInfo.height && (
                            <div>
                              <p className="text-muted-foreground">Height</p>
                              <p className="font-medium">
                                {medicalInfo.height}
                              </p>
                            </div>
                          )}
                          {medicalInfo.weight && (
                            <div>
                              <p className="text-muted-foreground">Weight</p>
                              <p className="font-medium">
                                {medicalInfo.weight}
                              </p>
                            </div>
                          )}
                        </div>

                        {medicalInfo.hasAllergies &&
                          medicalInfo.allergiesDetails && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm">
                              <div className="flex items-center gap-1 mb-0.5">
                                <AlertCircle className="size-3.5 text-red-600" />
                                <span className="font-semibold text-red-700">
                                  Allergies
                                </span>
                              </div>
                              <p>{medicalInfo.allergiesDetails}</p>
                              {medicalInfo.usesEpiPen && (
                                <p className="text-red-700 font-medium mt-0.5">
                                  Uses EpiPen
                                </p>
                              )}
                            </div>
                          )}

                        {(medicalInfo.hasMedicationsAtCamp ||
                          medicalInfo.hasMedicationsNotAtCamp) && (
                          <div className="mt-2 text-sm">
                            <p className="font-semibold text-xs">Medications</p>
                            {medicalInfo.hasMedicationsAtCamp &&
                              medicalInfo.medicationsAtCampDetails && (
                                <p>
                                  <span className="text-muted-foreground">
                                    At camp:{" "}
                                  </span>
                                  {medicalInfo.medicationsAtCampDetails}
                                </p>
                              )}
                            {medicalInfo.hasMedicationsNotAtCamp &&
                              medicalInfo.medicationsNotAtCampDetails && (
                                <p>
                                  <span className="text-muted-foreground">
                                    Not at camp:{" "}
                                  </span>
                                  {medicalInfo.medicationsNotAtCampDetails}
                                </p>
                              )}
                          </div>
                        )}

                        {medicalInfo.otcPermissions &&
                          medicalInfo.otcPermissions.length > 0 && (
                            <div className="mt-2 text-sm">
                              <p className="font-semibold text-xs mb-1">
                                OTC Medications Approved
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {medicalInfo.otcPermissions.map(
                                  (med: string) => (
                                    <Badge
                                      key={med}
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {med}
                                    </Badge>
                                  ),
                                )}
                              </div>
                            </div>
                          )}

                        {medicalInfo.hasMedicalConditions &&
                          medicalInfo.medicalConditionsDetails && (
                            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                              <p className="font-semibold text-yellow-800 mb-0.5">
                                Medical Conditions
                              </p>
                              <p>{medicalInfo.medicalConditionsDetails}</p>
                            </div>
                          )}

                        {medicalInfo.additionalInfo && (
                          <div className="mt-2 text-sm">
                            <p className="font-semibold text-xs">
                              Additional Notes
                            </p>
                            <p>{medicalInfo.additionalInfo}</p>
                          </div>
                        )}
                      </section>
                    </>
                  )}

                  <Separator className="my-3" />

                  <section className="text-sm">
                    <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
                      <Calendar className="size-4" />
                      Camp Session
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1">
                      <div>
                        <p className="text-muted-foreground">Camp</p>
                        <p className="font-medium">{data.campName}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Year</p>
                        <p className="font-medium">{data.year}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Price Tier</p>
                        <p className="font-medium">
                          {registration.price?.name || "N/A"}
                        </p>
                      </div>
                    </div>
                  </section>

                  {registration.details && (
                    <>
                      <Separator className="my-3" />
                      <section className="text-sm">
                        <h3 className="text-base font-semibold mb-2">
                          Additional Details
                        </h3>
                        <div className="space-y-1">
                          {registration.details.cabinRequest && (
                            <div>
                              <p className="text-muted-foreground">
                                Cabin Request
                              </p>
                              <p className="font-medium">
                                {registration.details.cabinRequest}
                              </p>
                            </div>
                          )}
                          {registration.details.parentSignature && (
                            <div>
                              <p className="text-muted-foreground">
                                Parent Signature
                              </p>
                              <p className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded inline-block">
                                {registration.details.parentSignature}
                              </p>
                            </div>
                          )}
                          {registration.details.additionalInfo && (
                            <div>
                              <p className="text-muted-foreground">
                                Additional Info
                              </p>
                              <p>{registration.details.additionalInfo}</p>
                            </div>
                          )}
                        </div>
                      </section>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
