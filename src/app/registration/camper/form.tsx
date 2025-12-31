"use client";
import CamperField from "./camper-field";
import type { CamperInfo } from "./schema";

type CamperFormProps = {
  campers: CamperInfo[];
};

export default function CamperForm({ campers }: CamperFormProps) {
  return (
    <div className="flex flex-col gap-3">
      {campers.map((camper) => (
        <CamperField key={camper.id} camper={camper} />
      ))}
    </div>
  );
}
