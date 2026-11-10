"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Camera, ImageOff, LoaderCircle, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, type FieldPath } from "react-hook-form";
import { createListingAction } from "@/app/ilan-ver/actions";
import { Field } from "@/components/forms/field";
import { FormAlert } from "@/components/forms/form-alert";
import { useErrorMessage } from "@/components/forms/use-error-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { isCategorySlug, type Category } from "@/lib/categories";
import { formatNumber, formatPrice } from "@/lib/format";
import { compressImage } from "@/lib/images/compress";
import {
  listingFormSchema,
  MAX_LISTING_IMAGES,
  type ListingFormValues,
} from "@/lib/listings/schema";
import { LISTING_IMAGES_BUCKET } from "@/lib/listings/storage";
import {
  deliveryTypes,
  listingFrequencies,
  listingUnits,
  palletConditions,
  priceTypes,
} from "@/lib/listings/types";
import { cities, priorityCities } from "@/lib/locations";
import { createClient } from "@/lib/supabase/client";
import { CategoryIcon } from "./category-icon";
import { ChoiceCard } from "./choice-card";

type ListingFormProps = {
  categories: Category[];
  companyId: string;
  defaultCity: string;
  defaultDistrict: string;
};

type Photo = { id: string; file: File; previewUrl: string };

const STEP_KEYS = [
  "type",
  "details",
  "quantity",
  "location",
  "photos",
  "preview",
] as const;

const STEP_FIELDS: FieldPath<ListingFormValues>[][] = [
  ["listingType", "categoryId"],
  ["title", "description", "condition", "ispm15", "dimensions"],
  ["quantity", "unit", "frequency", "priceType", "price", "delivery"],
  ["city", "district"],
  [],
  ["notHazardous"],
];

export function ListingForm({
  categories,
  companyId,
  defaultCity,
  defaultDistrict,
}: ListingFormProps) {
  const t = useTranslations("listingForm");
  const tListing = useTranslations("listing");
  const tCategory = useTranslations("categories");
  const errorMessage = useErrorMessage();

  const [step, setStep] = useState(0);
  const [rootId, setRootId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [phase, setPhase] = useState<"idle" | "uploading" | "saving">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const photosRef = useRef<Photo[]>([]);

  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    setError,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ListingFormValues>({
    resolver: zodResolver(listingFormSchema),
    // Hatalar yazarken temizlenir. Odak kaybında (blur) doğrulama yapılmaz: hata
    // metninin o anda kaybolması sayfayı kaydırıp bir sonraki dokunuşu ıskalatıyordu.
    mode: "onChange",
    defaultValues: {
      listingType: "offer",
      categoryId: "",
      title: "",
      description: "",
      condition: null,
      ispm15: false,
      dimensions: "",
      quantity: undefined,
      unit: "adet",
      frequency: "once",
      priceType: "negotiable",
      price: null,
      delivery: "negotiable",
      city: defaultCity,
      district: defaultDistrict,
      notHazardous: false,
    },
  });

  const values = watch();
  const roots = useMemo(
    () => categories.filter((item) => item.parentId === null),
    [categories],
  );
  const root = roots.find((item) => item.id === rootId) ?? null;
  const children = useMemo(
    () => (rootId ? categories.filter((item) => item.parentId === rootId) : []),
    [categories, rootId],
  );
  const isPallet = root?.group === "pallet";
  const selectedCategory =
    categories.find((item) => item.id === values.categoryId) ?? null;
  const otherCities = cities.filter(
    (city) => !(priorityCities as readonly string[]).includes(city),
  );
  const isBusy = phase !== "idle";
  const isLastStep = step === STEP_KEYS.length - 1;

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  // Bileşen kaldırılırken önizleme adreslerini serbest bırak.
  useEffect(() => {
    return () => {
      photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    };
  }, []);

  function goToStep(nextStep: number) {
    setStep(nextStep);
    setSubmitError(null);
    requestAnimationFrame(() => headingRef.current?.focus());
  }

  async function handleNext() {
    const isValid = await trigger(STEP_FIELDS[step]);
    // Alanlar arası kural (şemadaki superRefine) yalnızca tüm form geçerliyken
    // çalıştığı için sabit fiyat kontrolü bu adımda ayrıca yapılır.
    const price = getValues("price");
    if (
      step === 2 &&
      getValues("priceType") === "fixed" &&
      !(price !== null && price > 0)
    ) {
      setError("price", { type: "custom", message: "priceRequired" });
      return;
    }
    if (isValid) goToStep(step + 1);
  }

  function selectRoot(category: Category) {
    setRootId(category.id);
    const hasChildren = categories.some((item) => item.parentId === category.id);
    setValue("categoryId", hasChildren ? "" : category.id, {
      shouldValidate: !hasChildren,
    });
    if (category.group === "pallet") {
      setValue("unit", "adet");
    } else {
      setValue("condition", null);
      setValue("ispm15", false);
      setValue("dimensions", "");
    }
  }

  function addPhotos(fileList: FileList | null) {
    if (!fileList) return;
    const images = Array.from(fileList).filter((file) => file.type.startsWith("image/"));
    setPhotos((current) => {
      const room = MAX_LISTING_IMAGES - current.length;
      const added = images.slice(0, Math.max(room, 0)).map((file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
      }));
      return [...current, ...added];
    });
  }

  function removePhoto(id: string) {
    setPhotos((current) => {
      const removed = current.find((photo) => photo.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return current.filter((photo) => photo.id !== id);
    });
  }

  async function uploadPhotos(): Promise<string[]> {
    if (photos.length === 0) return [];
    const supabase = createClient();
    const bucket = supabase.storage.from(LISTING_IMAGES_BUCKET);
    const urls: string[] = [];
    for (const photo of photos) {
      const blob = await compressImage(photo.file);
      const path = `${companyId}/${crypto.randomUUID()}.jpg`;
      const { error } = await bucket.upload(path, blob, {
        contentType: "image/jpeg",
        cacheControl: "31536000",
      });
      if (error) throw new Error(error.message);
      urls.push(bucket.getPublicUrl(path).data.publicUrl);
    }
    return urls;
  }

  async function onSubmit(formValues: ListingFormValues) {
    setSubmitError(null);
    let imageUrls: string[];
    try {
      setPhase("uploading");
      imageUrls = await uploadPhotos();
    } catch (error) {
      console.error(error);
      setPhase("idle");
      setSubmitError("imageUploadFailed");
      return;
    }

    setPhase("saving");
    try {
      // Başarılı olursa sunucu ilan sayfasına yönlendirir ve buraya dönülmez.
      const result = await createListingAction(formValues, imageUrls);
      if (result?.error) {
        setSubmitError(result.error);
        setPhase("idle");
      }
    } catch (error) {
      // Yönlendirme Next.js tarafından hata olarak fırlatılır; yeniden fırlat.
      setPhase("idle");
      throw error;
    }
  }

  const fieldError = (name: keyof ListingFormValues) =>
    errorMessage(errors[name]?.message);
  const invalid = (name: keyof ListingFormValues) => ({
    "aria-invalid": Boolean(errors[name]),
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  });
  const unitLabel = tListing(`units.${values.unit}`);

  return (
    <form
      onSubmit={handleSubmit(onSubmit, () => setSubmitError("fixFields"))}
      noValidate
      className="flex flex-col gap-6"
    >
      <div>
        <p className="text-ink-muted text-sm font-medium" aria-live="polite">
          {t("stepLabel", { current: step + 1, total: STEP_KEYS.length })}
        </p>
        <div
          className="bg-brand-soft mt-2 h-1.5 overflow-hidden rounded-full"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={STEP_KEYS.length}
          aria-valuenow={step + 1}
          aria-label={t("stepLabel", { current: step + 1, total: STEP_KEYS.length })}
        >
          <div
            className="bg-brand-dark h-full rounded-full transition-[width]"
            style={{ width: `${((step + 1) / STEP_KEYS.length) * 100}%` }}
          />
        </div>
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-ink mt-4 text-xl font-bold outline-none"
        >
          {t(`steps.${STEP_KEYS[step]}`)}
        </h2>
      </div>

      {/* 1. Tür ve kategori */}
      <div hidden={step !== 0} className="flex flex-col gap-6">
        <fieldset className="flex flex-col gap-2">
          <legend className="text-ink mb-2 text-sm font-medium">
            {t("listingType")}
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <ChoiceCard
              value="offer"
              title={t("offerTitle")}
              description={t("offerDescription")}
              {...register("listingType")}
            />
            <ChoiceCard
              value="request"
              title={t("requestTitle")}
              description={t("requestDescription")}
              {...register("listingType")}
            />
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-ink mb-2 text-sm font-medium">{t("category")}</legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {roots.map((category) => (
              <ChoiceCard
                key={category.id}
                name="rootCategory"
                value={category.id}
                checked={rootId === category.id}
                onChange={() => selectRoot(category)}
                title={
                  isCategorySlug(category.slug) ? tCategory(category.slug) : category.name
                }
                icon={
                  <CategoryIcon
                    slug={isCategorySlug(category.slug) ? category.slug : "diger"}
                    className="size-5"
                  />
                }
                compact
              />
            ))}
          </div>
          {!rootId && errors.categoryId ? (
            <p role="alert" className="text-danger text-sm">
              {fieldError("categoryId")}
            </p>
          ) : null}
        </fieldset>

        {children.length > 0 ? (
          <Field
            id="categoryId"
            label={t("subcategory")}
            error={fieldError("categoryId")}
          >
            <Select
              id="categoryId"
              {...register("categoryId")}
              {...invalid("categoryId")}
            >
              <option value="">{t("subcategoryPlaceholder")}</option>
              {children.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
      </div>

      {/* 2. Detaylar */}
      <div hidden={step !== 1} className="flex flex-col gap-4">
        <Field
          id="title"
          label={t("titleLabel")}
          hint={t("titleHint")}
          error={fieldError("title")}
        >
          <Input
            id="title"
            maxLength={140}
            {...register("title")}
            {...invalid("title")}
          />
        </Field>
        <Field
          id="description"
          label={t("descriptionLabel")}
          optionalLabel={t("optional")}
          hint={t("descriptionHint")}
          error={fieldError("description")}
        >
          <Textarea
            id="description"
            {...register("description")}
            {...invalid("description")}
          />
        </Field>

        {isPallet ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="condition"
                label={t("condition")}
                optionalLabel={t("optional")}
                error={fieldError("condition")}
              >
                <Select
                  id="condition"
                  {...register("condition", {
                    setValueAs: (value: string | null) => value || null,
                  })}
                >
                  <option value="">{t("conditionPlaceholder")}</option>
                  {palletConditions.map((condition) => (
                    <option key={condition} value={condition}>
                      {tListing(`condition.${condition}`)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                id="dimensions"
                label={t("dimensions")}
                optionalLabel={t("optional")}
                hint={t("dimensionsHint")}
                error={fieldError("dimensions")}
              >
                <Input
                  id="dimensions"
                  {...register("dimensions")}
                  {...invalid("dimensions")}
                />
              </Field>
            </div>
            <label className="border-line flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border p-3">
              <input
                type="checkbox"
                className="accent-brand-dark size-5"
                {...register("ispm15")}
              />
              <span className="text-ink text-sm font-medium">{t("ispm15")}</span>
            </label>
          </>
        ) : null}
      </div>

      {/* 3. Miktar ve fiyat */}
      <div hidden={step !== 2} className="flex flex-col gap-5">
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Field id="quantity" label={t("quantity")} error={fieldError("quantity")}>
            <Input
              id="quantity"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              {...register("quantity", { valueAsNumber: true })}
              {...invalid("quantity")}
            />
          </Field>
          <Field id="unit" label={t("unit")} error={fieldError("unit")} className="w-32">
            <Select id="unit" {...register("unit")}>
              {(isPallet ? (["adet"] as const) : listingUnits).map((unit) => (
                <option key={unit} value={unit}>
                  {tListing(`units.${unit}`)}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <fieldset>
          <legend className="text-ink mb-2 text-sm font-medium">{t("frequency")}</legend>
          <div className="grid grid-cols-3 gap-2">
            {listingFrequencies.map((frequency) => (
              <ChoiceCard
                key={frequency}
                value={frequency}
                title={tListing(`frequency.${frequency}`)}
                compact
                {...register("frequency")}
              />
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-ink mb-2 text-sm font-medium">{t("priceType")}</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {priceTypes.map((priceType) => (
              <ChoiceCard
                key={priceType}
                value={priceType}
                title={tListing(`price.${priceType}`)}
                compact
                {...register("priceType")}
              />
            ))}
          </div>
        </fieldset>

        {values.priceType === "fixed" ? (
          <Field
            id="price"
            label={t("price")}
            hint={t("priceHint")}
            error={fieldError("price")}
          >
            <Input
              id="price"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              {...register("price", {
                setValueAs: (value: string | number | null) =>
                  value === "" || value === null ? null : Number(value),
              })}
              {...invalid("price")}
            />
          </Field>
        ) : null}

        <Field id="delivery" label={t("delivery")} error={fieldError("delivery")}>
          <Select id="delivery" {...register("delivery")}>
            {deliveryTypes.map((delivery) => (
              <option key={delivery} value={delivery}>
                {tListing(`delivery.${delivery}`)}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {/* 4. Konum */}
      <div hidden={step !== 3} className="grid gap-4 sm:grid-cols-2">
        <Field id="city" label={t("city")} error={fieldError("city")}>
          <Select id="city" {...register("city")} {...invalid("city")}>
            <option value="">{t("cityPlaceholder")}</option>
            <optgroup label={t("aegeanCities")}>
              {priorityCities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </optgroup>
            <optgroup label={t("otherCities")}>
              {otherCities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </optgroup>
          </Select>
        </Field>
        <Field
          id="district"
          label={t("district")}
          optionalLabel={t("optional")}
          error={fieldError("district")}
        >
          <Input id="district" {...register("district")} {...invalid("district")} />
        </Field>
      </div>

      {/* 5. Fotoğraflar */}
      <div hidden={step !== 4} className="flex flex-col gap-4">
        <p className="text-ink-muted text-sm">{t("photosHint")}</p>
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {photos.map((photo) => (
            <li
              key={photo.id}
              className="border-line relative aspect-square overflow-hidden rounded-lg border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- yerel önizleme (blob:) */}
              <img src={photo.previewUrl} alt="" className="size-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(photo.id)}
                aria-label={t("removePhoto")}
                className="text-brand-dark absolute top-1 right-1 flex size-8 items-center justify-center rounded-full bg-white shadow"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </li>
          ))}
          {photos.length < MAX_LISTING_IMAGES ? (
            <li>
              <label className="border-brand-dark text-brand-dark hover:bg-brand-soft has-focus-visible:outline-brand-dark flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed p-2 text-center text-xs font-semibold has-focus-visible:outline-2">
                <Camera aria-hidden="true" className="size-6" />
                {t("addPhotos")}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={(event) => {
                    addPhotos(event.target.files);
                    event.target.value = "";
                  }}
                />
              </label>
            </li>
          ) : null}
        </ul>
        <p className="text-ink-muted text-xs tabular-nums">
          {t("photoCount", { count: photos.length, max: MAX_LISTING_IMAGES })}
        </p>
      </div>

      {/* 6. Önizleme */}
      <div hidden={step !== 5} className="flex flex-col gap-5">
        <div className="border-line overflow-hidden rounded-xl border">
          <div className="bg-brand-soft flex h-40 items-center justify-center overflow-hidden">
            {photos[0] ? (
              // eslint-disable-next-line @next/next/no-img-element -- yerel önizleme (blob:)
              <img src={photos[0].previewUrl} alt="" className="size-full object-cover" />
            ) : (
              <span className="text-ink-muted flex items-center gap-2 text-sm">
                <ImageOff aria-hidden="true" className="size-5" />
                {t("noPhotos")}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-3 p-4">
            <div className="flex flex-wrap gap-1.5">
              <Badge variant={values.listingType === "offer" ? "brand" : "outline"}>
                {tListing(`type.${values.listingType}`)}
              </Badge>
              {selectedCategory ? (
                <Badge variant="soft">{selectedCategory.name}</Badge>
              ) : null}
              {isPallet && values.ispm15 ? <Badge>{tListing("ispm15")}</Badge> : null}
            </div>
            <p className="text-ink text-lg font-semibold">{values.title || "—"}</p>
            {values.description ? (
              <p className="text-ink-muted text-sm whitespace-pre-line">
                {values.description}
              </p>
            ) : null}
            <dl className="text-ink grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <dt className="text-ink-muted text-xs">{t("quantity")}</dt>
                <dd className="font-medium">
                  {Number.isFinite(values.quantity)
                    ? `${formatNumber(values.quantity)} ${unitLabel}`
                    : "—"}
                  {values.frequency !== "once"
                    ? ` · ${tListing(`frequency.${values.frequency}`)}`
                    : ""}
                </dd>
              </div>
              <div>
                <dt className="text-ink-muted text-xs">{t("priceType")}</dt>
                <dd className="font-medium">
                  {values.priceType === "fixed" && values.price !== null
                    ? `${formatPrice(values.price)} / ${unitLabel}`
                    : tListing(`price.${values.priceType}`)}
                </dd>
              </div>
              <div>
                <dt className="text-ink-muted text-xs">{t("delivery")}</dt>
                <dd className="font-medium">{tListing(`delivery.${values.delivery}`)}</dd>
              </div>
              <div>
                <dt className="text-ink-muted text-xs">{t("city")}</dt>
                <dd className="font-medium">
                  {[values.district, values.city].filter(Boolean).join(", ") || "—"}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="border-line flex cursor-pointer items-start gap-3 rounded-lg border p-3">
            <input
              type="checkbox"
              className="accent-brand-dark mt-0.5 size-5 shrink-0"
              {...register("notHazardous")}
              {...invalid("notHazardous")}
            />
            <span className="text-ink text-sm">{t("hazardLabel")}</span>
          </label>
          {errors.notHazardous ? (
            <p id="notHazardous-error" role="alert" className="text-danger text-sm">
              {fieldError("notHazardous")}
            </p>
          ) : null}
        </div>
      </div>

      {submitError ? (
        <FormAlert tone="error">{errorMessage(submitError)}</FormAlert>
      ) : null}

      {/* Mobilde başparmakla erişilebilsin diye altta sabit */}
      <div className="border-line sticky bottom-0 -mx-4 flex gap-3 border-t bg-white px-4 py-3 sm:static sm:mx-0 sm:border-0 sm:p-0">
        {step > 0 ? (
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={() => goToStep(step - 1)}
            disabled={isBusy}
          >
            <ArrowLeft aria-hidden="true" />
            {t("back")}
          </Button>
        ) : null}
        {isLastStep ? (
          <Button
            type="submit"
            size="lg"
            className="flex-1 sm:flex-none"
            disabled={isBusy}
          >
            {isBusy ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
            {phase === "uploading"
              ? t("uploading")
              : phase === "saving"
                ? t("submitting")
                : t("submit")}
          </Button>
        ) : (
          <Button
            type="button"
            size="lg"
            className="flex-1 sm:flex-none"
            onClick={handleNext}
          >
            {t("next")}
            <ArrowRight aria-hidden="true" />
          </Button>
        )}
      </div>
    </form>
  );
}
