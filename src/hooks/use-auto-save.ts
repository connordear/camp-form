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

export function useAutoSave(form: CampFormApi, debounceMs = 1500) {
  const [status, setStatus] = useState<AutoSaveStatus>("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const lastSavedRef = useRef<string>("");

  const values = useStore(form.store, (state) => state.values);
  const isDirty = useStore(form.store, (state) => state.isDirty);
  const isValid = useStore(form.store, (state) => state.isValid);
  const isMounted = useRef(false);

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      lastSavedRef.current = JSON.stringify(values);
      return;
    }

    if (!isDirty) return;

    if (!isValid) {
      setStatus("error");
      return;
    }

    // Check against Ref to prevent loop from our own updates
    const currentJson = JSON.stringify(values);
    if (currentJson === lastSavedRef.current) return;

    setStatus("debouncing");

    const handler = setTimeout(async () => {
      try {
        setStatus("saving");

        // 1. SNAPSHOT: What we are sending
        const valuesToSend = form.state.values;

        // 2. SEND
        const res = await saveRegistrationsForUser(valuesToSend.campers);

        // 3. SNAPSHOT: Live Form (Capture BEFORE we modify anything)
        const liveValues = form.state.values;

        // 4. DRIFT CHECK (Crucial: Do this BEFORE adding IDs)
        // Did the user type something new while the save was in flight?
        const hasDrifted =
          JSON.stringify(valuesToSend) !== JSON.stringify(liveValues);

        // 5. MAPPING (Your clean Map logic)
        const idMap = new Map<string, number>();
        const regIdMap = new Map<string, number>();

        valuesToSend.campers.forEach((sentCamper, index) => {
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

        // 6. MERGE IN MEMORY (Performant)
        // Instead of calling setFieldValue 50 times, we build the array once.
        const mergedCampers = liveValues.campers.map((camper) => {
          // Clone the camper to avoid mutating read-only state
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

        // 7. PREDICT FUTURE REF
        // We must update the Ref to match what the form *will* be
        if (!hasDrifted) {
          const nextState = { ...liveValues, campers: mergedCampers };
          lastSavedRef.current = JSON.stringify(nextState);
          setStatus("saved");
          setLastSaved(new Date());
        } else {
          // If drifted, we DON'T update the Ref.
          // The effect will run again, see mismatch, and trigger debounce.
          setStatus("debouncing");
        }

        // 8. SINGLE UPDATE
        form.setFieldValue("campers", mergedCampers);
      } catch (err) {
        console.error("Autosave failed", err);
        setStatus("error");
      }
    }, debounceMs);

    return () => clearTimeout(handler);
  }, [values, debounceMs, isDirty, form, isValid]);

  return { status, lastSaved };
}
