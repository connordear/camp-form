import { useStore } from "@tanstack/react-form";
import { useEffect, useRef, useState } from "react";
import { saveRegistrationsForUser } from "@/app/dashboard/actions";
import type { CampFormApi } from "./use-camp-form";

export type AutoSaveStatus =
  | "idle"
  | "debouncing"
  | "saving"
  | "saved"
  | "error";

export function useAutoSave(
  userId: number,
  form: CampFormApi,
  debounceMs = 1500,
) {
  const [status, setStatus] = useState<AutoSaveStatus>("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const lastSavedRef = useRef<string>("");

  const values = useStore(form.store, (state: any) => state.values);
  const isDirty = useStore(form.store, (state: any) => state.isDirty);
  const isMounted = useRef(false);

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      lastSavedRef.current = JSON.stringify(values);
      return;
    }

    if (!isDirty) return;

    const currentJson = JSON.stringify(values);
    if (currentJson === lastSavedRef.current) return;

    setStatus("debouncing");

    const handler = setTimeout(async () => {
      try {
        setStatus("saving");

        // 1. SNAPSHOT: What we are sending
        const valuesToSend = form.state.values;

        // 2. SEND: Server deletes missing IDs, Upserts the rest
        const res = await saveRegistrationsForUser(
          userId,
          valuesToSend.campers,
        );

        // 3. SNAPSHOT: Current Live Form (User might have deleted items during save!)
        const liveValues = form.state.values;

        // 4. MAPPING STRATEGY (The Fix)
        // We cannot rely on index 0 == index 0.
        // We map { clientId -> realDbId } using the data we just SENT.
        // Assumption: Server returns results in same order as sent (standard for Upsert/Returning)
        const idMap = new Map<string, number>();
        const regIdMap = new Map<string, number>(); // Nested registrations map

        valuesToSend.campers.forEach((sentCamper, index) => {
          const savedCamper = res.campers[index];

          // Map Camper ClientID -> Real ID
          if (sentCamper.clientId && savedCamper?.id) {
            idMap.set(sentCamper.clientId, savedCamper.id);

            // Map Nested Registration ClientID -> Real ID
            sentCamper.registrations?.forEach((sentReg, j) => {
              const savedReg = savedCamper.registrations?.[j];
              if (sentReg.clientId && savedReg?.id) {
                regIdMap.set(sentReg.clientId, savedReg.id);
              }
            });
          }
        });

        // 5. MERGE
        // Iterate over LIVE values. If they still exist, update their IDs from the Map.
        const mergedCampers = liveValues.campers.map((camper) => {
          // Look up the real ID using our stable clientId
          const newCamperId = idMap.get(camper.clientId);

          return {
            ...camper,
            // If we found a new ID, use it. Otherwise keep existing (or undefined)
            id: newCamperId ?? camper.id,

            registrations: camper.registrations?.map((reg) => ({
              ...reg,
              id: regIdMap.get(reg.clientId) ?? reg.id,
            })),
          };
        });

        // 6. Loop Break Logic
        const hasDrifted =
          JSON.stringify(valuesToSend) !== JSON.stringify(liveValues);

        form.setFieldValue("campers", mergedCampers);

        if (hasDrifted) {
          // User changed something (added/removed/edited) during save
          // Restart debounce
          setStatus("debouncing");
        } else {
          // Clean save
          const nextFormState = { ...liveValues, campers: mergedCampers };
          lastSavedRef.current = JSON.stringify(nextFormState);

          setStatus("saved");
          setLastSaved(new Date());
        }
      } catch (err) {
        console.error("Autosave failed", err);
        setStatus("error");
      }
    }, debounceMs);

    return () => clearTimeout(handler);
  }, [values, debounceMs, isDirty, userId, form]);

  return { status, lastSaved };
}
