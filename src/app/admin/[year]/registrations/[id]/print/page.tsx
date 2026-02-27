import { format } from "date-fns";
import { and, eq } from "drizzle-orm";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getSession, hasMedicalAccess } from "@/lib/auth-helpers";
import { db } from "@/lib/data/db";
import { registrations } from "@/lib/data/schema";
import { capitalize } from "@/lib/utils";

interface PrintPageProps {
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

export default async function PrintRegistrationPage({
  params,
}: PrintPageProps) {
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  const { year: yearParam, id: registrationId } = await params;
  const year = parseInt(yearParam, 10);

  if (Number.isNaN(year)) {
    notFound();
  }

  const canViewMedical = hasMedicalAccess(session.user.role);

  const registration = await db.query.registrations.findFirst({
    where: and(
      eq(registrations.id, registrationId),
      eq(registrations.campYear, year),
    ),
    with: {
      camper: {
        with: {
          address: true,
          medicalInfo: true,
          emergencyContacts: {
            with: {
              emergencyContact: true,
            },
            orderBy: (contacts, { asc }) => [asc(contacts.priority)],
          },
        },
      },
      campYear: {
        with: {
          camp: true,
        },
      },
      price: true,
      details: true,
    },
  });

  if (!registration) {
    notFound();
  }

  const { camper } = registration;
  const medicalInfo = canViewMedical ? camper.medicalInfo : null;

  return (
    <div className="min-h-screen bg-white p-8 max-w-4xl mx-auto print:p-0 print:m-0 print:max-w-none">
      <div className="print:hidden mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Registration Print View</h1>
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
            Camper Registration - {registration.campYear.year}
          </p>
        </div>

        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold">
              {camper.firstName} {camper.lastName}
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

        <Separator />

        <section>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <User className="size-5" />
            Camper Information
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Date of Birth</p>
              <p className="font-medium">{formatDate(camper.dateOfBirth)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Gender</p>
              <p className="font-medium capitalize">{camper.gender || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Shirt Size</p>
              <p className="font-medium">{camper.shirtSize || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Swimming Level</p>
              <p className="font-medium">{camper.swimmingLevel || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Previous Camper</p>
              <p className="font-medium">
                {camper.hasBeenToCamp ? "Yes" : "No"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Photos Allowed</p>
              <p className="font-medium">
                {camper.arePhotosAllowed ? "Yes" : "No"}
              </p>
            </div>
            {camper.dietaryRestrictions && (
              <div className="col-span-2 md:col-span-3">
                <p className="text-sm text-muted-foreground">
                  Dietary Restrictions
                </p>
                <p className="font-medium">{camper.dietaryRestrictions}</p>
              </div>
            )}
          </div>
        </section>

        {camper.address && (
          <>
            <Separator />
            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <MapPin className="size-5" />
                Address
              </h3>
              <div className="text-sm">
                <p className="font-medium">{camper.address.addressLine1}</p>
                {camper.address.addressLine2 && (
                  <p className="font-medium">{camper.address.addressLine2}</p>
                )}
                <p className="font-medium">
                  {camper.address.city}, {camper.address.stateProv}{" "}
                  {camper.address.postalZip}
                </p>
                <p className="font-medium">{camper.address.country}</p>
              </div>
            </section>
          </>
        )}

        {camper.emergencyContacts && camper.emergencyContacts.length > 0 && (
          <>
            <Separator />
            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Phone className="size-5" />
                Emergency Contacts
              </h3>
              <div className="space-y-3">
                {camper.emergencyContacts.map((contact, index) => (
                  <div
                    key={contact.emergencyContact.id}
                    className="flex items-start justify-between p-3 bg-gray-50 rounded-md"
                  >
                    <div>
                      <p className="font-medium">
                        {index + 1}. {contact.emergencyContact.name}
                      </p>
                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-1">
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
                      {contact.emergencyContact.relationship === "other"
                        ? contact.emergencyContact.relationshipOther || "Other"
                        : capitalize(contact.emergencyContact.relationship)}
                    </Badge>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {medicalInfo && (
          <>
            <Separator />
            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Heart className="size-5" />
                Medical Information
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Health Care #</p>
                  <p className="font-medium">{medicalInfo.healthCareNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Family Doctor</p>
                  <p className="font-medium">{medicalInfo.familyDoctor}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Doctor Phone</p>
                  <p className="font-medium">{medicalInfo.doctorPhone}</p>
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

              {medicalInfo.hasAllergies && medicalInfo.allergiesDetails && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="size-4 text-red-600" />
                    <span className="font-semibold text-red-700">
                      Allergies
                    </span>
                  </div>
                  <p className="text-sm">{medicalInfo.allergiesDetails}</p>
                  {medicalInfo.usesEpiPen && (
                    <p className="text-sm text-red-700 font-medium mt-1">
                      Uses EpiPen
                    </p>
                  )}
                </div>
              )}

              {(medicalInfo.hasMedicationsAtCamp ||
                medicalInfo.hasMedicationsNotAtCamp) && (
                <div className="mt-4 space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-1">
                    <Heart className="size-4" />
                    Medications
                  </h4>
                  {medicalInfo.hasMedicationsAtCamp &&
                    medicalInfo.medicationsAtCampDetails && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">At camp: </span>
                        {medicalInfo.medicationsAtCampDetails}
                      </div>
                    )}
                  {medicalInfo.hasMedicationsNotAtCamp &&
                    medicalInfo.medicationsNotAtCampDetails && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">
                          Not at camp:{" "}
                        </span>
                        {medicalInfo.medicationsNotAtCampDetails}
                      </div>
                    )}
                </div>
              )}

              {medicalInfo.otcPermissions &&
                medicalInfo.otcPermissions.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold text-sm mb-2">
                      OTC Medications Approved
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {medicalInfo.otcPermissions.map((med: string) => (
                        <Badge
                          key={med}
                          variant="secondary"
                          className="text-xs"
                        >
                          {med}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

              {medicalInfo.hasMedicalConditions &&
                medicalInfo.medicalConditionsDetails && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <h4 className="font-semibold text-sm text-yellow-800 mb-1">
                      Medical Conditions
                    </h4>
                    <p className="text-sm">
                      {medicalInfo.medicalConditionsDetails}
                    </p>
                  </div>
                )}

              {medicalInfo.additionalInfo && (
                <div className="mt-4">
                  <h4 className="font-semibold text-sm mb-1">
                    Additional Notes
                  </h4>
                  <p className="text-sm">{medicalInfo.additionalInfo}</p>
                </div>
              )}
            </section>
          </>
        )}

        <Separator />

        <section>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Calendar className="size-5" />
            Camp Session
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Camp</p>
              <p className="font-medium">{registration.campYear.camp.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Year</p>
              <p className="font-medium">{registration.campYear.year}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Price Tier</p>
              <p className="font-medium">{registration.price?.name || "N/A"}</p>
            </div>
          </div>
        </section>

        {registration.details && (
          <>
            <Separator />
            <section>
              <h3 className="text-lg font-semibold mb-3">Additional Details</h3>
              <div className="space-y-2">
                {registration.details.cabinRequest && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Cabin Request
                    </p>
                    <p className="font-medium">
                      {registration.details.cabinRequest}
                    </p>
                  </div>
                )}
                {registration.details.parentSignature && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Parent Signature
                    </p>
                    <p className="font-mono text-xs bg-gray-100 px-2 py-1 rounded inline-block">
                      {registration.details.parentSignature}
                    </p>
                  </div>
                )}
                {registration.details.additionalInfo && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Additional Info
                    </p>
                    <p>{registration.details.additionalInfo}</p>
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        <Separator />

        <div className="pt-8 border-t-2 border-dashed">
          <h3 className="text-lg font-semibold mb-4">Check-In Verification</h3>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Parent/Guardian Signature
              </p>
              <div className="border-b border-gray-400 h-12"></div>
              <p className="text-sm text-muted-foreground mt-2">
                Date: ________________
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Director Verification
              </p>
              <div className="border-b border-gray-400 h-12"></div>
              <p className="text-sm text-muted-foreground mt-2">
                Date: ________________
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
