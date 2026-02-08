"use client";

import { useEffect, useId, useRef } from "react";
import {
  type CollapsibleFormCardRef,
  type RegisteredForm,
  useFormRegistryContext,
} from "@/contexts/form-registry-context";

// Using a minimal interface for form API to avoid complex generic types
interface MinimalFormApi {
  state: {
    isDefaultValue: boolean;
    isValid: boolean;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  validate: (cause: "change" | "blur" | "submit" | "mount") => Promise<any> | any;
}

type UseFormRegistryOptions = {
  formApi: MinimalFormApi;
  cardRef: React.RefObject<CollapsibleFormCardRef | null>;
  /**
   * Custom validation function. If not provided, uses formApi.validate('submit').
   * Should return true if valid, false if invalid.
   */
  validate?: () => Promise<boolean>;
  /**
   * Custom save function. Called only if validation passes.
   * Should return true if save succeeded, false if failed.
   */
  save: () => Promise<boolean>;
};

/**
 * Hook to register a form with the FormRegistry.
 * This enables the "Save & Continue" button to save all forms on the page.
 *
 * @example
 * ```tsx
 * const cardRef = useRef<CollapsibleFormCardRef>(null);
 *
 * useFormRegistry({
 *   formApi: form,
 *   cardRef,
 *   save: async () => {
 *     if (form.state.isDefaultValue) return true; // Nothing to save
 *     await form.handleSubmit();
 *     return true;
 *   },
 * });
 *
 * return <CollapsibleFormCard ref={cardRef} ... />;
 * ```
 */
export function useFormRegistry({
  formApi,
  cardRef,
  validate,
  save,
}: UseFormRegistryOptions) {
  const id = useId();
  const { register, unregister } = useFormRegistryContext();

  // Keep refs to the latest functions to avoid stale closures
  const validateRef = useRef(validate);
  const saveRef = useRef(save);
  const formApiRef = useRef(formApi);

  useEffect(() => {
    validateRef.current = validate;
    saveRef.current = save;
    formApiRef.current = formApi;
  });

  useEffect(() => {
    const registeredForm: RegisteredForm = {
      cardRef,
      isDirty: () => !formApiRef.current.state.isDefaultValue,
      validate: async () => {
        if (validateRef.current) {
          return validateRef.current();
        }
        // Trigger validation and check the form state
        await formApiRef.current.validate("submit");
        return formApiRef.current.state.isValid;
      },
      save: async () => {
        return saveRef.current();
      },
    };

    register(id, registeredForm);
    return () => unregister(id);
  }, [id, register, unregister, cardRef]);
}

type UseManualFormRegistryOptions = {
  cardRef: React.RefObject<CollapsibleFormCardRef | null>;
  /**
   * Returns true if the form has unsaved changes.
   */
  isDirty: () => boolean;
  /**
   * Returns true if the form data is valid.
   */
  validate: () => Promise<boolean>;
  /**
   * Saves the form. Returns true if save succeeded.
   */
  save: () => Promise<boolean>;
};

/**
 * Hook to register a manually-managed form (not using TanStack Form) with the FormRegistry.
 * Use this for forms that manage their own state with useState.
 *
 * @example
 * ```tsx
 * const cardRef = useRef<CollapsibleFormCardRef>(null);
 * const [selectedIds, setSelectedIds] = useState<string[]>([]);
 * const savedIds = initialData.map(d => d.id);
 *
 * const isDirty = selectedIds.length !== savedIds.length ||
 *   selectedIds.some(id => !savedIds.includes(id));
 *
 * useManualFormRegistry({
 *   cardRef,
 *   isDirty: () => isDirty,
 *   validate: async () => selectedIds.length >= 2,
 *   save: async () => {
 *     if (!isDirty) return true;
 *     await saveAction(selectedIds);
 *     return true;
 *   },
 * });
 * ```
 */
export function useManualFormRegistry({
  cardRef,
  isDirty,
  validate,
  save,
}: UseManualFormRegistryOptions) {
  const id = useId();
  const { register, unregister } = useFormRegistryContext();

  // Keep refs to the latest functions to avoid stale closures
  const isDirtyRef = useRef(isDirty);
  const validateRef = useRef(validate);
  const saveRef = useRef(save);

  useEffect(() => {
    isDirtyRef.current = isDirty;
    validateRef.current = validate;
    saveRef.current = save;
  });

  useEffect(() => {
    const registeredForm: RegisteredForm = {
      cardRef,
      isDirty: () => isDirtyRef.current(),
      validate: async () => validateRef.current(),
      save: async () => saveRef.current(),
    };

    register(id, registeredForm);
    return () => unregister(id);
  }, [id, register, unregister, cardRef]);
}
