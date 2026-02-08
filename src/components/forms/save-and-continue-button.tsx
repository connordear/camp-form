"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useFormRegistryContext } from "@/contexts/form-registry-context";
import { Button } from "../ui/button";

const navItems = [
  { href: "/registration/overview", label: "Overview" },
  { href: "/registration/camper", label: "Camper Info" },
  { href: "/registration/camp", label: "Camp Info" },
  { href: "/registration/medical-info", label: "Medical Info" },
  { href: "/registration/emergency-contact", label: "Emergency Contacts" },
  { href: "/registration/checkout", label: "Payment" },
];

/**
 * Fixed floating button that saves all forms and navigates to the next page.
 *
 * Behavior:
 * - Validates and saves all forms on the current page
 * - If all forms are valid and saved, navigates to the next page
 * - If any form has validation errors, shows a toast and expands/scrolls to the first invalid card
 * - Shows "Save & Checkout" on the Emergency Contacts page
 * - Hidden on Checkout pages
 */
export function SaveAndContinueButton() {
  const pathname = usePathname();
  const router = useRouter();
  const { saveAllForms } = useFormRegistryContext();
  const [isSaving, setIsSaving] = useState(false);

  const currentIndex = navItems.findIndex((item) => item.href === pathname);
  const nextPage = navItems[currentIndex + 1];
  const isLastFormPage = pathname === "/registration/emergency-contact";

  // Don't show on checkout pages or if there's no next page
  if (pathname.includes("/checkout") || !nextPage) {
    return null;
  }

  const handleClick = async () => {
    setIsSaving(true);

    try {
      const result = await saveAllForms();

      if (result.success) {
        router.push(nextPage.href);
      } else {
        const toastId = toast.error(
          `${result.errorCount} form${result.errorCount > 1 ? "s have" : " has"} validation errors`,
        );

        // Auto-dismiss after 2 seconds
        setTimeout(() => toast.dismiss(toastId), 2000);

        // Expand and scroll to the first invalid card
        if (result.firstInvalidCardRef?.current) {
          result.firstInvalidCardRef.current.expand();
          // Small delay to allow the card to expand before scrolling
          setTimeout(() => {
            result.firstInvalidCardRef?.current?.scrollIntoView();
          }, 100);
        }
      }
    } catch (error) {
      console.error("Error saving forms:", error);
      const toastId = toast.error("An error occurred while saving");
      setTimeout(() => toast.dismiss(toastId), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  const buttonText = isLastFormPage ? "Save & Checkout" : "Save & Continue";

  return (
    <Button
      className="fixed bottom-4 right-4 z-50 shadow-lg"
      onClick={handleClick}
      disabled={isSaving}
    >
      {isSaving ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Saving...
        </>
      ) : (
        <>
          {buttonText}
          <ArrowRight className="ml-2 h-4 w-4" />
        </>
      )}
    </Button>
  );
}
