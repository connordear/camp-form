import { redirectToCurrentYear } from "./actions";

export default async function AdminPage() {
  await redirectToCurrentYear();
}
