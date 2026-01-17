import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { addresses, campers } from "@/lib/data/schema";

export const addressSelectSchema = createSelectSchema(addresses);
export type Address = z.infer<typeof addressSelectSchema>;

export const addressInsertSchema = createInsertSchema(addresses, {
  addressLine1: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  country: z.string().min(1, "Country is required"),
  postalZip: z.string().min(1, "Postal/Zip Code is required"),
  stateProv: z.string().min(1, "Province/State is required"),
  id: z.string().nonoptional(),
}).omit({
  userId: true, // let this handle from cookies
});
export type AddressFormValues = z.infer<typeof addressInsertSchema>;

export const camperInfoSelectSchema = createSelectSchema(campers);

export type CamperInfo = z.infer<typeof camperInfoSelectSchema>;

export const camperInfoInsertSchema = createInsertSchema(campers, {
  dateOfBirth: (schema) =>
    schema.min(10, "Date must be in the format YYYY-MM-DD"),
  swimmingLevel: z.string(),
  gender: z.string().min(1, "Please specify a gender"),
  hasBeenToCamp: z.boolean(),
  shirtSize: z.string().min(1, "Please specify a shirt size"),
  dietaryRestrictions: z.string(),
})
  .extend({
    addressId: z
      .string("Please select an address, or create a new one to use.")
      .min(0, "Please select an address, or create a new one to use."),
  })
  .required({
    id: true, // required here since we only want creation/deletion on the home page
    userId: true,
    arePhotosAllowed: true,
  })
  .pick({
    id: true,
    userId: true,
    swimmingLevel: true,
    dateOfBirth: true,
    gender: true,
    hasBeenToCamp: true,
    shirtSize: true,
    addressId: true,
    arePhotosAllowed: true,
    dietaryRestrictions: true,
  });

export type CamperInfoForm = z.infer<typeof camperInfoInsertSchema>;
