import CampField from "./field";
import type { RegistrationDetail } from "./schema";

type CamperFormProps = {
  registrations: RegistrationDetail[];
};

export default function CampForm({ registrations }: CamperFormProps) {
  return (
    <div className="flex flex-col gap-3 items-center">
      {(registrations ?? []).map((r) => (
        <CampField key={r.id} registration={r} />
      ))}
    </div>
  );
}
