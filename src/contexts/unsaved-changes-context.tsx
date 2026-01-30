"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";

type UnsavedChangesContextValue = {
  register: (id: string, getIsDirty: () => boolean) => void;
  unregister: (id: string) => void;
};

const UnsavedChangesContext = createContext<UnsavedChangesContextValue | null>(
  null,
);

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const dirtyGettersRef = useRef(new Map<string, () => boolean>());

  const register = useCallback((id: string, getIsDirty: () => boolean) => {
    dirtyGettersRef.current.set(id, getIsDirty);
  }, []);

  const unregister = useCallback((id: string) => {
    dirtyGettersRef.current.delete(id);
  }, []);

  const hasDirtyForms = useCallback(() => {
    for (const getter of dirtyGettersRef.current.values()) {
      if (getter()) return true;
    }
    return false;
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasDirtyForms()) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasDirtyForms]);

  // Single click listener for client-side navigation
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!hasDirtyForms()) return;

      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        target.target === "_blank" ||
        target.hasAttribute("download")
      ) {
        return;
      }

      const isInternal =
        href.startsWith("/") || href.startsWith(window.location.origin);
      if (!isInternal) return;

      const confirmed = window.confirm(
        "You have unsaved changes. Are you sure you want to leave this page?",
      );

      if (!confirmed) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [hasDirtyForms]);

  return (
    <UnsavedChangesContext.Provider value={{ register, unregister }}>
      {children}
    </UnsavedChangesContext.Provider>
  );
}

export function useUnsavedChangesContext() {
  const context = useContext(UnsavedChangesContext);
  if (!context) {
    throw new Error(
      "useUnsavedChangesContext must be used within UnsavedChangesProvider",
    );
  }
  return context;
}
