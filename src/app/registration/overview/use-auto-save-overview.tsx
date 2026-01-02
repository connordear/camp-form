import { useStore } from "@tanstack/react-form";
import { useAutoSave } from "@/hooks/use-auto-save";
import type { AppFormApi } from "@/lib/types/common-types";
import { saveRegistrationsForUser } from "./actions";
import type { RegistrationFormValues } from "./schema";

export type CampFormApi = AppFormApi<RegistrationFormValues>;

export default function useOverviewAutoSave(form: CampFormApi) {
  const values = useStore(form.store, (state) => state.values);
  const isDirty = useStore(form.store, (state) => state.isDirty);
  const isValid = useStore(form.store, (state) => state.isValid);

  return useAutoSave({
    values,
    isDirty,
    isValid,
    debounceMs: 1500,

    // 1. BUSINESS LOGIC: How to save and merge data
    onSave: async (snapshot) => {
      // A. Perform API Call
      await saveRegistrationsForUser(snapshot.campers);

      // B. Drift Check: Get fresh state directly from store
      // We check if the user typed something new while the request was in flight.
      const liveValues = form.store.state.values;

      if (JSON.stringify(snapshot) !== JSON.stringify(liveValues)) {
        return undefined; // Abort! The generic hook will retry next cycle.
      }

      // D. Return the full "Merged" state
      return snapshot;
    },

    // 2. UPDATE LOGIC: How to apply the merged data
    onUpdate: (mergedValues) => {
      // We safely update only the 'campers' field
      form.setFieldValue("campers", mergedValues.campers);
    },
  });
}
