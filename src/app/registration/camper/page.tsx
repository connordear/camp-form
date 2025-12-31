import { getAddresses, getCampers } from "./actions";
import CamperField from "./camper-field";

export default async function CamperPage() {
  const campersPromise = getCampers();
  const addressesPromise = getAddresses();

  const [campers, addresses] = await Promise.all([
    campersPromise,
    addressesPromise,
  ]);

  return (
    <div className="flex flex-col gap-3">
      {(campers ?? []).map((camper) => (
        <CamperField key={camper.id} camper={camper} addresses={addresses} />
      ))}
    </div>
  );
}
