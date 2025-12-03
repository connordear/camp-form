import { z } from 'zod';
import { createSelectSchema } from 'drizzle-zod';
import { campers, registrations, users } from './schema';

export const registrationSchema = createSelectSchema(registrations);
export const camperSchema = createSelectSchema(campers);

export const userSchema = createSelectSchema(users).extend({
  campers: z.array(
    camperSchema.extend({
      registrations: z.array(registrationSchema)
    })
  )
})
