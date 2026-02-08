"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";

export type CollapsibleFormCardRef = {
  expand: () => void;
  scrollIntoView: () => void;
};

export type RegisteredForm = {
  cardRef: React.RefObject<CollapsibleFormCardRef | null>;
  /** Returns true if the form has unsaved changes */
  isDirty: () => boolean;
  /** Returns true if the form is valid */
  validate: () => Promise<boolean>;
  /** Saves the form. Returns true if save succeeded. */
  save: () => Promise<boolean>;
};

type SaveResult = {
  success: boolean;
  errorCount: number;
  firstInvalidCardRef?: React.RefObject<CollapsibleFormCardRef | null>;
};

type FormRegistryContextValue = {
  register: (id: string, form: RegisteredForm) => void;
  unregister: (id: string) => void;
  saveAllForms: () => Promise<SaveResult>;
};

const FormRegistryContext = createContext<FormRegistryContextValue | null>(
  null,
);

export function FormRegistryProvider({ children }: { children: ReactNode }) {
  const formsRef = useRef(new Map<string, RegisteredForm>());

  const register = useCallback((id: string, form: RegisteredForm) => {
    formsRef.current.set(id, form);
  }, []);

  const unregister = useCallback((id: string) => {
    formsRef.current.delete(id);
  }, []);

  // Check if any form has unsaved changes
  const hasDirtyForms = useCallback(() => {
    for (const form of formsRef.current.values()) {
      if (form.isDirty()) return true;
    }
    return false;
  }, []);

  // Save all forms and return result
  const saveAllForms = useCallback(async (): Promise<SaveResult> => {
    const forms = Array.from(formsRef.current.entries());
    let errorCount = 0;
    let firstInvalidCardRef: React.RefObject<CollapsibleFormCardRef | null> | undefined;

    for (const [_id, form] of forms) {
      // Validate the form
      const isValid = await form.validate();

      if (!isValid) {
        errorCount++;
        if (!firstInvalidCardRef) {
          firstInvalidCardRef = form.cardRef;
        }
        continue;
      }

      // If valid, attempt to save (the save function handles dirty check internally)
      const saveSuccess = await form.save();
      if (!saveSuccess) {
        errorCount++;
        if (!firstInvalidCardRef) {
          firstInvalidCardRef = form.cardRef;
        }
      }
    }

    return {
      success: errorCount === 0,
      errorCount,
      firstInvalidCardRef,
    };
  }, []);

  // Handle beforeunload warning
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

  // Handle client-side navigation warning
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
    <FormRegistryContext.Provider value={{ register, unregister, saveAllForms }}>
      {children}
    </FormRegistryContext.Provider>
  );
}

export function useFormRegistryContext() {
  const context = useContext(FormRegistryContext);
  if (!context) {
    throw new Error(
      "useFormRegistryContext must be used within FormRegistryProvider",
    );
  }
  return context;
}
