import { z } from "zod";
import { isCity } from "@/lib/locations";

export const companyFormSchema = z.object({
  name: z.string().trim().min(2, "companyNameMin").max(160, "tooLong"),
  taxNumber: z
    .string()
    .trim()
    .refine((value) => value === "" || /^[0-9]{10,11}$/.test(value), "taxNumberInvalid"),
  sector: z.string().trim().max(80, "tooLong"),
  phone: z
    .string()
    .trim()
    .refine((value) => /^[0-9+ ()-]{10,20}$/.test(value), "phoneInvalid"),
  city: z.string().refine(isCity, "cityRequired"),
  district: z.string().trim().max(80, "tooLong"),
  description: z.string().trim().max(1000, "tooLong"),
});

export type CompanyFormValues = z.infer<typeof companyFormSchema>;

export type Company = {
  id: string;
  ownerId: string;
  slug: string;
  name: string;
  taxNumber: string | null;
  sector: string | null;
  phone: string | null;
  city: string;
  district: string | null;
  description: string | null;
  isVerified: boolean;
};
