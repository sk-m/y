import { Field } from "./use-form"

export type ValueFromPath<FieldValues, FieldName> =
  FieldName extends `${infer First}.${infer Rest}`
    ? First extends keyof FieldValues
      ? Rest extends keyof FieldValues[First]
        ? FieldName
        : FieldValues[First] extends unknown[]
        ? Rest extends `${string}.${infer RestRest &
            keyof FieldValues[First][number] &
            string}${"" | `.${string}`}`
          ? FieldValues[First][number][RestRest &
              keyof FieldValues[First][number] &
              string]
          : never
        : never
      : never
    : FieldName extends keyof FieldValues
    ? FieldValues[FieldName]
    : never

export type FieldNameFromPath<FieldValues, FieldName> =
  FieldName extends `${infer First}.${infer Rest}`
    ? First extends keyof FieldValues
      ? Rest extends keyof FieldValues[First]
        ? FieldName
        : FieldValues[First] extends unknown[]
        ? Rest extends `${string}.${keyof FieldValues[First][number] & string}${
            | ""
            | `.${string}`}`
          ? FieldName
          : never
        : never
      : never
    : FieldName extends keyof FieldValues
    ? FieldName
    : never

export type TWatchedFields<FieldValues> = ReadonlyArray<
  `${keyof FieldValues & string}` | `${keyof FieldValues & string}.${string}`
>

export const validateFieldValue = (field: Field) => {
  const value = field.controlled
    ? field.controller?.[0]()
    : field.inputRef?.value ?? null

  if (field.required && !value) return "This field is required"

  if (field.validate) {
    return field.validate(value)
  }
}

export const findDefaultValue = <
  FieldValues extends { [K in string]: FieldValues | unknown }
>(
  defaultValues: FieldValues,
  fieldName: string | string[]
): unknown => {
  const fieldNameParts = Array.isArray(fieldName)
    ? fieldName
    : fieldName.split(".")

  const firstPart = fieldNameParts[0]

  if (!firstPart) return null

  if (fieldNameParts.length === 1) {
    return defaultValues[firstPart] ?? null
  }

  if (typeof defaultValues[firstPart] === "object") {
    return findDefaultValue(
      defaultValues[firstPart] as FieldValues,
      fieldNameParts.slice(1)
    )
  }

  return null
}

export const isFieldWatched = <WatchedFields extends Readonly<string[]>>(
  fieldName: string,
  watch: WatchedFields
) => {
  return (
    watch.includes(fieldName) ||
    // ! TODO This is a pretty dumb way to check this
    watch.some(
      (watchedField) =>
        watchedField.includes("*") &&
        fieldName.includes(watchedField.replace("*", ""))
    )
  )
}
