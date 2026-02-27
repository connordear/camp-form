"use client";

import { format } from "date-fns";
import {
  AlertCircle,
  Calendar,
  FileText,
  Heart,
  Mail,
  MapPin,
  Phone,
  Printer,
  Stethoscope,
  User,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { capitalize } from "@/lib/utils";
import { getRegistrationDetail, getRegistrationMedicalInfo } from "../actions";
import type { AdminRegistration, AdminRegistrationDetail } from "../schema";

interface RegistrationModalProps {
  registration: AdminRegistration | null;
  userRole: "admin" | "hcp" | "staff";
  onClose: () => void;
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

function formatPrice(cents: number | null): string {
  if (cents === null || cents === undefined) return "N/A";
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(dateStr: string | Date): string {
  return format(new Date(dateStr), "MMM d, yyyy");
}

function formatDateTime(dateStr: string | Date): string {
  return format(new Date(dateStr), "MMM d, yyyy h:mm a");
}

export function RegistrationModal({
  registration,
  userRole,
  onClose,
}: RegistrationModalProps) {
  const [detail, setDetail] = useState<AdminRegistrationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRegistrationDetail = useCallback(
    async (registrationId: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getRegistrationDetail(registrationId);
        if (data) {
          // If user is admin or hcp, fetch medical info separately
          if (userRole === "admin" || userRole === "hcp") {
            try {
              const medicalInfo =
                await getRegistrationMedicalInfo(registrationId);
              if (medicalInfo) {
                data.medicalInfo = medicalInfo;
              }
            } catch (err) {
              console.error("Failed to load medical info:", err);
            }
          }
          setDetail(data);
        } else {
          setError("Registration not found");
        }
      } catch (err) {
        setError("Failed to load registration details");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    },
    [userRole],
  );

  useEffect(() => {
    if (registration) {
      loadRegistrationDetail(registration.id);
    } else {
      setDetail(null);
      setError(null);
    }
  }, [registration, loadRegistrationDetail]);

  const isOpen = registration !== null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">
              {detail
                ? `${detail.camper.firstName} ${detail.camper.lastName}`
                : "Loading..."}
            </DialogTitle>
            {detail && (
              <a
                href={`/admin/${detail.campYear.year}/registrations/${detail.id}/print`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md border bg-background hover:bg-muted transition-colors"
              >
                <Printer className="size-4" />
                Print
              </a>
            )}
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 mt-4">
            <div className="h-32 bg-muted animate-pulse rounded" />
            <div className="h-48 bg-muted animate-pulse rounded" />
            <div className="h-32 bg-muted animate-pulse rounded" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-destructive">{error}</div>
        ) : detail ? (
          <div className="space-y-6 mt-4">
            {/* Emergency Contacts - First */}
            {detail.emergencyContacts.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                  Emergency Contacts
                </h3>
                <div className="space-y-3">
                  {detail.emergencyContacts.map((contact, index) => (
                    <div
                      key={contact.emergencyContact.id}
                      className="flex items-start justify-between"
                    >
                      <div>
                        <p className="font-medium">
                          {index + 1}. {contact.emergencyContact.name}
                        </p>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm text-muted-foreground mt-1">
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
                          ? contact.emergencyContact.relationshipOther ||
                            "Other"
                          : capitalize(contact.emergencyContact.relationship)}
                      </Badge>
                    </div>
                  ))}
                </div>
                <Separator className="mt-6" />
              </div>
            )}

            {/* Medical Information - Admin and HCP only */}
            {(userRole === "admin" || userRole === "hcp") &&
              detail.medicalInfo && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-1">
                    <Stethoscope className="size-4" />
                    Medical Information
                  </h3>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">
                        Health Care #
                      </span>
                      <p className="font-medium">
                        {detail.medicalInfo.healthCareNumber}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Doctor</span>
                      <p className="font-medium">
                        {detail.medicalInfo.familyDoctor}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Doctor Phone
                      </span>
                      <p className="font-medium">
                        {detail.medicalInfo.doctorPhone}
                      </p>
                    </div>
                    {detail.medicalInfo.height && (
                      <div>
                        <span className="text-muted-foreground">Height</span>
                        <p className="font-medium">
                          {detail.medicalInfo.height}
                        </p>
                      </div>
                    )}
                    {detail.medicalInfo.weight && (
                      <div>
                        <span className="text-muted-foreground">Weight</span>
                        <p className="font-medium">
                          {detail.medicalInfo.weight}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Allergies */}
                  {detail.medicalInfo.hasAllergies &&
                    detail.medicalInfo.allergiesDetails && (
                      <div className="mt-4 p-3 bg-destructive/10 rounded border border-destructive/20">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertCircle className="size-4 text-destructive" />
                          <span className="font-semibold text-destructive text-sm">
                            Allergies
                          </span>
                        </div>
                        <p className="text-sm">
                          {detail.medicalInfo.allergiesDetails}
                        </p>
                        {detail.medicalInfo.usesEpiPen && (
                          <p className="text-sm text-destructive mt-1 font-medium">
                            Uses EpiPen
                          </p>
                        )}
                      </div>
                    )}

                  {/* Medications */}
                  {(detail.medicalInfo.hasMedicationsAtCamp ||
                    detail.medicalInfo.hasMedicationsNotAtCamp) && (
                    <div className="mt-4 space-y-2">
                      <h4 className="font-semibold text-sm flex items-center gap-1">
                        <Heart className="size-4" />
                        Medications
                      </h4>
                      {detail.medicalInfo.hasMedicationsAtCamp &&
                        detail.medicalInfo.medicationsAtCampDetails && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">
                              At camp:{" "}
                            </span>
                            {detail.medicalInfo.medicationsAtCampDetails}
                          </div>
                        )}
                      {detail.medicalInfo.hasMedicationsNotAtCamp &&
                        detail.medicalInfo.medicationsNotAtCampDetails && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">
                              Not at camp:{" "}
                            </span>
                            {detail.medicalInfo.medicationsNotAtCampDetails}
                          </div>
                        )}
                    </div>
                  )}

                  {/* OTC Permissions */}
                  {detail.medicalInfo.otcPermissions &&
                    detail.medicalInfo.otcPermissions.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-semibold text-sm mb-2">
                          OTC Medications
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {detail.medicalInfo.otcPermissions.map((med) => (
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

                  {/* Medical Conditions */}
                  {detail.medicalInfo.hasMedicalConditions &&
                    detail.medicalInfo.medicalConditionsDetails && (
                      <div className="mt-4 p-3 bg-yellow-500/10 rounded border border-yellow-500/20">
                        <h4 className="font-semibold text-sm text-yellow-700 mb-1">
                          Medical Conditions
                        </h4>
                        <p className="text-sm">
                          {detail.medicalInfo.medicalConditionsDetails}
                        </p>
                      </div>
                    )}

                  {/* Additional Medical Info */}
                  {detail.medicalInfo.additionalInfo && (
                    <div className="mt-4">
                      <h4 className="font-semibold text-sm mb-1">Notes</h4>
                      <p className="text-sm">
                        {detail.medicalInfo.additionalInfo}
                      </p>
                    </div>
                  )}

                  <Separator className="mt-6" />
                </div>
              )}

            {/* Registration Summary */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-1">
                <FileText className="size-4" />
                Registration
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Status</span>
                  <p>
                    <Badge
                      variant={getStatusBadgeVariant(detail.status)}
                      className="text-xs"
                    >
                      {capitalize(detail.status)}
                    </Badge>
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Registered</span>
                  <p className="font-medium">
                    {formatDateTime(detail.createdAt)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Camp</span>
                  <p className="font-medium">{detail.campYear.camp.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Year</span>
                  <p className="font-medium">{detail.campYear.year}</p>
                </div>
              </div>
              <Separator className="mt-6" />
            </div>

            {/* Camper Information */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-1">
                <User className="size-4" />
                Camper Info
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">DOB</span>
                  <p className="font-medium">
                    {formatDate(detail.camper.dateOfBirth)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Gender</span>
                  <p className="font-medium capitalize">
                    {detail.camper.gender || "N/A"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Shirt Size</span>
                  <p className="font-medium">
                    {detail.camper.shirtSize || "N/A"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Swimming</span>
                  <p className="font-medium">
                    {detail.camper.swimmingLevel || "N/A"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Previous Camper</span>
                  <p className="font-medium">
                    {detail.camper.hasBeenToCamp ? "Yes" : "No"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Photos OK</span>
                  <p className="font-medium">
                    {detail.camper.arePhotosAllowed ? "Yes" : "No"}
                  </p>
                </div>
                {detail.camper.dietaryRestrictions && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Dietary</span>
                    <p className="font-medium">
                      {detail.camper.dietaryRestrictions}
                    </p>
                  </div>
                )}
              </div>
              <Separator className="mt-6" />
            </div>

            {/* Address */}
            {detail.camper.address && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-1">
                  <MapPin className="size-4" />
                  Address
                </h3>
                <div className="text-sm">
                  <p className="font-medium">
                    {detail.camper.address.addressLine1}
                  </p>
                  {detail.camper.address.addressLine2 && (
                    <p className="font-medium">
                      {detail.camper.address.addressLine2}
                    </p>
                  )}
                  <p className="font-medium">
                    {detail.camper.address.city},{" "}
                    {detail.camper.address.stateProv}{" "}
                    {detail.camper.address.postalZip}
                  </p>
                  <p className="font-medium">{detail.camper.address.country}</p>
                </div>
                <Separator className="mt-6" />
              </div>
            )}

            {/* Camp Details */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-1">
                <Calendar className="size-4" />
                Camp
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Name</span>
                  <p className="font-medium">{detail.campYear.camp.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Year</span>
                  <p className="font-medium">{detail.campYear.year}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Price Tier</span>
                  <p className="font-medium">{detail.price?.name || "N/A"}</p>
                </div>
              </div>
              <Separator className="mt-6" />
            </div>

            {/* Payment Information - Admin only */}
            {userRole === "admin" && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                  Payment
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Price Paid</span>
                    <p className="font-medium">
                      {formatPrice(detail.pricePaid)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Base Price</span>
                    <p className="font-medium">
                      {detail.price ? formatPrice(detail.price.price) : "N/A"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Days</span>
                    <p className="font-medium">{detail.numDays || "N/A"}</p>
                  </div>
                </div>
                <Separator className="mt-6" />
              </div>
            )}

            {/* Registration Details */}
            {detail.details && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                  Additional Details
                </h3>
                <div className="space-y-2 text-sm">
                  {detail.details.cabinRequest && (
                    <div>
                      <span className="text-muted-foreground">
                        Cabin Request:{" "}
                      </span>
                      <span className="font-medium">
                        {detail.details.cabinRequest}
                      </span>
                    </div>
                  )}
                  {detail.details.parentSignature && (
                    <div>
                      <span className="text-muted-foreground">Signature: </span>
                      <span className="font-mono text-xs bg-muted px-1 rounded">
                        {detail.details.parentSignature}
                      </span>
                    </div>
                  )}
                  {detail.details.additionalInfo && (
                    <div>
                      <span className="text-muted-foreground">Notes: </span>
                      <span>{detail.details.additionalInfo}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
