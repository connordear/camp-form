import { z } from 'zod'

export const RegistrationSchema = z.object({
  campId: z.string().min(1, "Camp is required"),
  firstName: z.string().min(1, 'A first name is required'),
  lastName: z.string().min(1, 'A last name is required'),
})

export type Registration = z.infer<typeof RegistrationSchema>

export const defaultValuesRegistration: Registration = {
  campId: '',
  firstName: '',
  lastName: '',
}
