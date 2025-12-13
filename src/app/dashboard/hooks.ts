"use client";

import { useEffect, useState, useRef } from "react";
import { useDebounce } from "use-debounce";
import { ReactFormExtendedApi, useStore } from "@tanstack/react-form"; // <-- Import the hook from the lib
import { toast } from "sonner";
import { saveRegistrationsForUser } from "@/app/dashboard/actions";
import { CampFormUser } from "@/lib/types/user-types";

export function useAutoSave(
  // We can just type 'form' as 'any' or a generic object with a store.
  // This bypasses the complex "FormApi" generic hell entirely.
  form: ReactFormExtendedApi<CampFormUser["campers"]>,
  clerkId: string,
) {
  // 1. Use the hook from the docs
  // We explicitly type 'state' here to get TypeScript safety back
  const formValues = useStore(
    form.store,
    (state: { values: CampFormUser }) => state.values,
  );

  // 2. Debounce the values (1000ms delay)
  const [debouncedValues] = useDebounce(formValues, 1000);

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const isMounted = useRef(false);

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }

    const performAutoSave = async () => {
      // Access the current state directly from the store to check dirtiness
      const currentDirtyState = form.store.state.isDirty;
      if (!currentDirtyState) return;

      setIsSaving(true);
      try {
        if (!debouncedValues.campers) return;

        console.log("Auto-saving...");
        const serverData = await saveRegistrationsForUser(
          clerkId,
          debouncedValues.campers,
        );

        // Surgical Update:
        // We use form.setFieldValue (which exists on the form object)
        serverData.campers.forEach((serverCamper, index) => {
          // @ts-ignore - The form object is 'any' here, but this method exists
          form.setFieldValue(`campers[${index}].id`, serverCamper.id);
        });

        setLastSaved(new Date());
      } catch (error) {
        console.error("Auto-save failed", error);
        toast.error("Could not auto-save.");
      } finally {
        setIsSaving(false);
      }
    };

    performAutoSave();
  }, [debouncedValues]);

  return { isSaving, lastSaved };
}
