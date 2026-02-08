import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export type AutoSaveStatus =
  | "idle"
  | "debouncing"
  | "saving"
  | "saved"
  | "error";

interface UseAutoSaveOptions<T> {
  values: T;
  isDirty?: boolean;
  isValid?: boolean;
  debounceMs?: number;
  onSave: (snapshot: T) => Promise<T | undefined | undefined>;
  onUpdate: (newValues: T) => void;
}

export function useAutoSave<T>({
  values,
  isDirty = true,
  isValid = true,
  onSave,
  onUpdate,
  debounceMs = 1500,
}: UseAutoSaveOptions<T>) {
  const [status, setStatus] = useState<AutoSaveStatus>("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const lastSavedRef = useRef<string>("");
  const isMounted = useRef(false);
  const valuesRef = useRef(values);

  // 1. KEEP CALLBACKS STABLE
  // We store the latest functions in refs so we can call them without
  // making the useEffect depend on them (which causes resets).
  const onSaveRef = useRef(onSave);
  const onUpdateRef = useRef(onUpdate);

  useLayoutEffect(() => {
    onSaveRef.current = onSave;
    onUpdateRef.current = onUpdate;
    valuesRef.current = values;
  });

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

    const currentJson = JSON.stringify(values);
    if (currentJson === lastSavedRef.current) return;

    // Start Debounce
    setStatus("debouncing");

    const handler = setTimeout(async () => {
      try {
        setStatus("saving");

        // 2. CALL VIA REF
        // call the latest logic without breaking the effect dependency chain
        const mergedData = await onSaveRef.current(values);

        // 3. RACE CONDITION CHECK
        // If the user typed while we were awaiting, the 'values' prop
        // in the PARENT component has changed, but this effect closure
        // is stale. Ideally, your 'onSave' drift check handles this,
        // but we handle the UI state transition here.

        if (mergedData) {
          lastSavedRef.current = JSON.stringify(mergedData);
          onUpdateRef.current(mergedData);
          setLastSaved(new Date());
          setStatus("saved");
        } else {
          // Drift detected (onSave returned undefined)
          // We go back to debouncing to wait for the NEXT timeout cycle
          // which is already queued if the user kept typing.
          setStatus("debouncing");
        }
      } catch (err) {
        console.error(err);
        setStatus("error");
      }
    }, debounceMs);

    return () => clearTimeout(handler);
    // 4. CLEAN DEPENDENCIES
    // Note: onSave and onUpdate are NOT here.
    // Only 'values' changes should trigger a restart.
  }, [values, isDirty, isValid, debounceMs]);

  /**
   * Force an immediate save, bypassing the debounce.
   * Returns true if save succeeded, false otherwise.
   */
  const forceSave = useCallback(async (): Promise<boolean> => {
    const currentValues = valuesRef.current;
    const currentJson = JSON.stringify(currentValues);

    // If nothing has changed since last save, consider it a success
    if (currentJson === lastSavedRef.current) {
      return true;
    }

    try {
      setStatus("saving");
      const mergedData = await onSaveRef.current(currentValues);

      if (mergedData) {
        lastSavedRef.current = JSON.stringify(mergedData);
        onUpdateRef.current(mergedData);
        setLastSaved(new Date());
        setStatus("saved");
        return true;
      } else {
        // Drift detected, retry with latest values
        const retryValues = valuesRef.current;
        const retryData = await onSaveRef.current(retryValues);
        if (retryData) {
          lastSavedRef.current = JSON.stringify(retryData);
          onUpdateRef.current(retryData);
          setLastSaved(new Date());
          setStatus("saved");
          return true;
        }
        setStatus("error");
        return false;
      }
    } catch (err) {
      console.error(err);
      setStatus("error");
      return false;
    }
  }, []);

  return { status, lastSaved, forceSave };
}
