import { AnimatePresence, motion } from "framer-motion";
import { useFieldContext } from "@/hooks/use-camp-form"; // Your context hook
import { FieldError } from "../ui/field";

export function WithErrors({ children }: { children: React.ReactNode }) {
  const field = useFieldContext();
  const errors = field.state.meta.errors ?? [];
  const hasErrors = errors.length > 0;

  return (
    // 1. ISOLATION: A gap-less column to protect against parent layout gaps
    <div className="flex flex-col">
      {/* 2. RENDER INPUT */}
      {children}

      {/* 3. RENDER ERRORS (with animated spacing) */}
      <AnimatePresence mode="wait">
        {hasErrors && (
          <motion.div
            key="field-errors"
            // We animate marginTop from 0px -> 8px (approx gap-2)
            initial={{ height: 0, opacity: 0, marginTop: 0 }}
            animate={{ height: "auto", opacity: 1, marginTop: 8 }}
            exit={{ height: 0, opacity: 0, marginTop: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <FieldError className="mt-0">
              {errors.map((e) => e.message).join(", ")}
            </FieldError>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
