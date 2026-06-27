import type { CampPrintRegistration } from "../actions";

export const PRINT_PAGE_STYLE = `
  @page {
    margin: 0;
  }

  @media print {
    html,
    body {
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .camp-print-page-block {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .camp-print-page-break {
      break-before: page;
      page-break-before: always;
    }

    .camp-print-page-break:first-child {
      break-before: auto;
      page-break-before: auto;
    }
  }
`;

export function formatDate(value: string | null | undefined) {
  if (!value) return null;
  return new Date(`${value}T00:00:00`).toLocaleDateString();
}

export function formatBoolean(value: boolean | null | undefined) {
  if (value === null || value === undefined) return null;
  return value ? "Yes" : "No";
}

export function formatRelationship(
  relationship: string,
  relationshipOther: string | null,
) {
  if (relationship === "other") return relationshipOther || "Other";
  return relationship.charAt(0).toUpperCase() + relationship.slice(1);
}

export function camperName(registration: CampPrintRegistration) {
  return `${registration.camper.firstName} ${registration.camper.lastName}`;
}

export function medicalSummaryVisible(registration: CampPrintRegistration) {
  const medical = registration.medicalInfo;
  return Boolean(
    registration.camper.dietaryRestrictions ||
      registration.details?.additionalInfo ||
      medical?.hasAllergies ||
      medical?.hasMedicalConditions ||
      medical?.additionalInfo,
  );
}
