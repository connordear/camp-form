import MedicalInfoField from "./field";
import type { CamperWithMedicalInfo } from "./schema";

type CamperFormProps = {
  campersWithMedicalInfo: CamperWithMedicalInfo[];
};

export default function MedicalInfoForm({
  campersWithMedicalInfo,
}: CamperFormProps) {
  return (
    <div className="flex flex-col gap-3 items-center">
      {(campersWithMedicalInfo ?? []).map((c) => (
        <MedicalInfoField key={c.camper.id} data={c} />
      ))}
    </div>
  );
}
