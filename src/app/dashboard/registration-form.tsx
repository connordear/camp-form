import { CampFormUser } from "@/lib/types/user-types"
import { getRegistrationsForUser } from "./actions"

type RegistrationFormProps = {
  user: CampFormUser
}

export default function RegistrationForm({ user }: RegistrationFormProps) {

  return user?.campers.map(camper => (
    <div>
      {camper.name}
      {camper.registrations.map(registration => (
        <div>
          {registration.campId}
        </div>
      ))}
    </div>
  ))
} 
