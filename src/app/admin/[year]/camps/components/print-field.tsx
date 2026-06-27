import type { ReactNode } from "react";

type PrintFieldProps = {
  label: string;
  content: ReactNode;
  columnWidth?: string;
  stacked?: boolean;
};

export function PrintField({
  label,
  content,
  columnWidth = "95px",
  stacked = false,
}: PrintFieldProps) {
  if (content === null || content === undefined || content === "") return null;

  return (
    <div className={stacked ? "flex flex-col gap-1" : "flex flex-row gap-2"}>
      <h2
        className="shrink-0 font-semibold"
        style={{
          textAlign: stacked ? "left" : "right",
          width: stacked ? "auto" : columnWidth,
        }}
      >
        {label}
        {stacked ? "" : ":"}
      </h2>
      <div className="font-normal">{content}</div>
    </div>
  );
}
