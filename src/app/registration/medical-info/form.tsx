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
      <div className="max-w-xl">
        <h3>🩺 Medical Data Collection & Privacy Notice</h3>

        <br />
        <p>
          In compliance with Alberta Camping Association (ACA) standards,
          Mulhurst Camp collects necessary medical history to ensure the safety
          of every camper, including adults.
        </p>
        <br />
        <p>
          This data is stored on our secure, Canadian-hosted private gateway and
          is deleted after 3 years. It is never shared with third parties.
        </p>
      </div>
      {(campersWithMedicalInfo ?? []).map((c) => (
        <MedicalInfoField key={c.camper.id} data={c} />
      ))}
    </div>
  );
}
