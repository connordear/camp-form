"use client";

import { useEffect, useId, useRef } from "react";
import { useUnsavedChangesContext } from "@/contexts/unsaved-changes-context";

export function useUnsavedChangesWarning(getIsDirty: () => boolean) {
  const id = useId();
  const { register, unregister } = useUnsavedChangesContext();

  // Keep a ref to the latest getter so we always use the current closure
  const getIsDirtyRef = useRef(getIsDirty);
  useEffect(() => {
    getIsDirtyRef.current = getIsDirty;
  });

  useEffect(() => {
    // Register with a stable wrapper that calls the latest getter
    register(id, () => getIsDirtyRef.current());

    return () => unregister(id);
  }, [id, register, unregister]);
}
