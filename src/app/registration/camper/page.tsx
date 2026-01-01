import { getAddresses, getCampers } from "./actions";
import CamperForm from "./form";

export default async function CamperPage() {
  const campersPromise = getCampers();
  const addressesPromise = getAddresses();

  const [campers, addresses] = await Promise.all([
    campersPromise,
    addressesPromise,
  ]);

  return <CamperForm campers={campers ?? []} addresses={addresses} />;
}
