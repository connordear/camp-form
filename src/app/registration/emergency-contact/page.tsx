import {
  getCampersWithEmergencyContacts,
  getEmergencyContacts,
} from "./actions";
import EmergencyContactForm from "./form";

export default async function EmergencyContactPage() {
  const [campers, contacts] = await Promise.all([
    getCampersWithEmergencyContacts(),
    getEmergencyContacts(),
  ]);

  return <EmergencyContactForm campers={campers} allContacts={contacts} />;
}
