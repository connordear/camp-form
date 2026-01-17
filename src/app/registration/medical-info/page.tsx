import { getMedicalInfo } from "./actions";
import MedicalInfoForm from "./form";

export default async function MedicalInfoPage() {
  const data = await getMedicalInfo();

  return <MedicalInfoForm campersWithMedicalInfo={data} />;
}
