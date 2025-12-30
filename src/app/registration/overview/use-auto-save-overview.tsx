import { useStore } from "@tanstack/react-form";
import { useAutoSave } from "@/hooks/use-auto-save";
import { useAppForm } from "@/hooks/use-camp-form";
import { saveRegistrationsForUser } from "./actions";
import { formSchema } from "./schema";
import type { RegistrationFormValues } from "./types";

const _formInferHelper = () => {
  return useAppForm({
    defaultValues: {} as RegistrationFormValues,
    validators: {
      onChange: formSchema,
    },
  });
};

export type CampFormApi = ReturnType<typeof _formInferHelper>;

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
      const res = await saveRegistrationsForUser(snapshot.campers);

      // B. Drift Check: Get fresh state directly from store
      // We check if the user typed something new while the request was in flight.
      const liveValues = form.store.state.values;

      if (JSON.stringify(snapshot) !== JSON.stringify(liveValues)) {
        return undefined; // Abort! The generic hook will retry next cycle.
      }

      // C. Mapping Logic: Map Server IDs back to Local State
      const idMap = new Map<string, number>();
      const regIdMap = new Map<string, number>();

      // Populate Maps from Server Response
      snapshot.campers.forEach((sentCamper, index) => {
        const savedCamper = res.campers[index];
        if (savedCamper?.id) {
          idMap.set(sentCamper.clientId, savedCamper.id);

          sentCamper.registrations?.forEach((sentReg, j) => {
            const savedReg = savedCamper.registrations?.[j];
            if (savedReg?.id) {
              regIdMap.set(sentReg.clientId, savedReg.id);
            }
          });
        }
      });

      // Build New Camper Array (Immutable update)
      const mergedCampers = snapshot.campers.map((camper) => {
        const newCamper = { ...camper };

        // Inject Camper ID if missing
        if (!newCamper.id) {
          const newId = idMap.get(newCamper.clientId);
          if (newId) newCamper.id = newId;
        }

        // Inject Registration IDs if missing
        if (newCamper.registrations) {
          newCamper.registrations = newCamper.registrations.map((reg) => {
            if (!reg.id) {
              const newRegId = regIdMap.get(reg.clientId);
              if (newRegId) return { ...reg, id: newRegId };
            }
            return reg;
          });
        }
        return newCamper;
      });

      // D. Return the full "Merged" state
      return { ...snapshot, campers: mergedCampers };
    },

    // 2. UPDATE LOGIC: How to apply the merged data
    onUpdate: (mergedValues) => {
      // We safely update only the 'campers' field
      form.setFieldValue("campers", mergedValues.campers);
    },
  });
}
