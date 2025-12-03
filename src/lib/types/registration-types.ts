import { z } from 'zod'
import { registrationSchema } from '../zod-schema'

export type Registration = z.infer<typeof registrationSchema>

export const defaultValuesRegistration: Partial<Registration> = {
  isPaid: false,
}
