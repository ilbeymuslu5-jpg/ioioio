import { z } from "zod";
import { isCity } from "@/lib/locations";
import {
  deliveryTypes,
  listingFrequencies,
  listingTypes,
  listingUnits,
  palletConditions,
  priceTypes,
} from "./types";

export const MAX_LISTING_IMAGES = 8;

/**
 * İlan formu şeması. Hata mesajları messages/tr.json → errors altındaki anahtarlardır.
 * Web formu ve sunucu aynı şemayı kullanır; ileride mobil uygulama da paylaşacak.
 */
export const listingFormSchema = z
  .object({
    listingType: z.enum(listingTypes, { error: "required" }),
    categoryId: z.uuid({ error: "categoryRequired" }),
    title: z.string().trim().min(5, "titleMin").max(140, "titleMax"),
    description: z.string().trim().max(4000, "descriptionMax"),
    condition: z.enum(palletConditions).nullable(),
    ispm15: z.boolean(),
    dimensions: z.string().trim().max(40, "tooLong"),
    quantity: z.number({ error: "quantityRequired" }).positive("quantityRequired"),
    unit: z.enum(listingUnits, { error: "required" }),
    frequency: z.enum(listingFrequencies, { error: "required" }),
    priceType: z.enum(priceTypes, { error: "required" }),
    price: z.number({ error: "priceRequired" }).nonnegative("priceRequired").nullable(),
    delivery: z.enum(deliveryTypes, { error: "required" }),
    city: z.string().refine(isCity, "cityRequired"),
    district: z.string().trim().max(80, "tooLong"),
    notHazardous: z.boolean().refine((value) => value, "hazardRequired"),
  })
  .superRefine((values, context) => {
    if (values.priceType === "fixed" && (values.price === null || values.price <= 0)) {
      context.addIssue({ code: "custom", path: ["price"], message: "priceRequired" });
    }
  });

export type ListingFormValues = z.infer<typeof listingFormSchema>;

export const listingImageUrlsSchema = z.array(z.url()).max(MAX_LISTING_IMAGES);
