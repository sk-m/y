/* eslint-disable sonarjs/cognitive-complexity */

/* eslint-disable solid/reactivity */

/* eslint-disable @typescript-eslint/no-floating-promises */
import {
  Accessor,
  Setter,
  Signal,
  createEffect,
  createSignal,
  createUniqueId,
} from "solid-js"
import {
  createMutable,
  createStore,
  produce,
  reconcile,
  unwrap,
} from "solid-js/store"

import {
  FieldNameFromPath,
  TWatchedFields,
  ValueFromPath,
  findDefaultValue,
  isFieldWatched,
  validateFieldValue,
} from "./use-form.utils"
import { debug } from "./utils"

export type UseFormInput<FieldValues, WatchedFields> = {
  defaultValues?: { [K in keyof FieldValues]: FieldValues[K] }
  watch?: WatchedFields
  onSubmit?: (values: FieldValues) => void
  disabled?: () => boolean
}

export type FieldValidateFunction = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any
) => string | null | undefined | false

export type FieldOptions = {
  required?: boolean
  validate?: FieldValidateFunction
}

export type Field = {
  name: string
  controlled: boolean

  inputRef: HTMLInputElement | null

  controller?: Signal<unknown>
  initialValue?: unknown

  required: boolean
  validate?: FieldValidateFunction
}

export type Fieldset = {
  name: string
  fields: string[]
}

export type FormState = {
  fields: Field[]
  fieldsets: Fieldset[]
  fieldErrors: { [K in string]: string }
}

export type Form<
  FieldValues extends {
    [K in
      | `${keyof FieldValues & string}`
      | `${keyof FieldValues & string}.${string}`]: FieldValues[K]
  },
  WatchedFields extends TWatchedFields<FieldValues>
> = {
  register: <FieldName extends string>(
    name: FieldNameFromPath<FieldValues, FieldName>,
    options?: FieldOptions
  ) => {
    name: FieldName
    ref: (ref: HTMLInputElement) => void
  }

  registerControlled: <FieldName extends keyof FieldValues & string>(
    name: FieldNameFromPath<FieldValues, FieldName>,
    options?: FieldOptions
  ) => {
    name: FieldName
    value: Accessor<
      FieldName extends keyof FieldValues & string
        ? FieldValues[FieldName]
        : unknown
    >
    onChange: Setter<
      FieldName extends keyof FieldValues & string
        ? FieldValues[FieldName]
        : unknown
    >
  }

  watch: <
    FieldName extends
      | WatchedFields[number]
      | `${WatchedFields[number]}.${string}`
      | string,
    CustomFieldValue
  >(
    name: FieldNameFromPath<FieldValues, FieldName>
  ) => () => FieldName extends
    | WatchedFields[number]
    | `${WatchedFields[number]}.${string}`
    ? ValueFromPath<FieldValues, FieldName>
    : CustomFieldValue

  useFieldset: <
    FieldsetName extends
      | (keyof FieldValues & string)
      | `${keyof FieldValues & string}.${string}`
  >(
    name: FieldNameFromPath<FieldValues, FieldsetName>
  ) => {
    fields: () => string[]
    append: () => void
    remove: (fieldId: string) => void
    move: (fromIndex: number, toIndex: number) => void
  }

  submit: (event?: Event) => void

  getValue: <
    FieldName extends string,
    FieldValue extends ValueFromPath<FieldValues, FieldName>
  >(
    fieldName: FieldNameFromPath<FieldValues, FieldName>
  ) => FieldValue | null

  setValue: <
    FieldName extends string,
    FieldValue extends ValueFromPath<FieldValues, FieldName>
  >(
    fieldName: FieldNameFromPath<FieldValues, FieldName>,
    value: FieldValue | ((currentValue: FieldValue) => FieldValue)
  ) => void

  errors: () => { [K in string]: string }
}

export const useForm = <
  FieldValues extends {
    [K in
      | `${keyof FieldValues & string}`
      | `${keyof FieldValues & string}.${string}`]: FieldValues[K]
  },
  WatchedFields extends TWatchedFields<FieldValues> = []
>({
  defaultValues,
  watch,
  onSubmit,
  disabled,
}: UseFormInput<FieldValues, WatchedFields> = {}): Form<
  FieldValues,
  WatchedFields
> => {
  const [form, setForm] = createStore<FormState>({
    fields: [],
    fieldsets: [],
    fieldErrors: {},
  })

  const registerUncontrolled = <
    FieldName extends
      | (keyof FieldValues & string)
      | `${keyof FieldValues & string}.${string}`
  >(
    name: FieldName,
    options: FieldOptions = {}
  ) => {
    return {
      name,

      ref: (ref: HTMLInputElement) => {
        debug("[use-form] registering uncontrolled", { name })

        const fieldsetName = name.split(".")[0]

        const defaultValue =
          defaultValues && findDefaultValue(defaultValues, name.split("."))

        if (defaultValue) {
          if (ref.type === "checkbox") {
            ref.checked = defaultValue as boolean
          } else {
            ref.value = defaultValue as string
          }
        }

        const controller = createSignal(defaultValue)

        if (
          fieldsetName
            ? isFieldWatched(fieldsetName, (watch ?? []) as Readonly<string[]>)
            : isFieldWatched(name, (watch ?? []) as Readonly<string[]>)
        ) {
          debug("[use-form] registering a watcher", { name })

          // TODO I don't think we are ever removing the event listeners we set in use-form!
          if (ref.type === "checkbox") {
            ref.addEventListener("change", () => {
              controller[1](ref.checked as FieldValues[keyof FieldValues])
            })
          } else {
            ref.addEventListener("input", () => {
              controller[1](ref.value as FieldValues[keyof FieldValues])
            })
          }
        }

        setForm(
          "fields",
          produce((fields) => {
            const field = fields.find(
              (registeredField) => registeredField.name === name
            )

            if (field) {
              if (field.initialValue) {
                ref.value = field.initialValue as string
                ref.dispatchEvent(new Event("input"))
              }

              field.inputRef = ref
              field.controller = controller
              field.required = options.required ?? false
              field.validate = options.validate
            } else {
              fields.push({
                name,
                controlled: false,
                inputRef: ref,
                controller,
                required: options.required ?? false,
                validate: options.validate,
              })
            }
          })
        )
      },
    }
  }

  const watchHandler = <
    FieldName extends
      | WatchedFields[number]
      | `${WatchedFields[number]}.${string}`
      | string,
    CustomFieldValue
  >(
    name: FieldNameFromPath<FieldValues, FieldName>
  ) => {
    const [fieldValue, setFieldValue] = createSignal<Field>()

    createEffect(() => {
      debug("[use-form] trying to find a field for a watcher", { name })

      setFieldValue(
        unwrap(form.fields).find(
          (registeredField) => registeredField.name === name
        )
      )
    })

    return createMutable(
      () => fieldValue()?.controller?.[0]?.() ?? null
    ) as () => FieldName extends
      | WatchedFields[number]
      | `${WatchedFields[number]}.${string}`
      ? ValueFromPath<FieldValues, FieldName>
      : CustomFieldValue
  }

  const processFieldsetDefaultValues = <
    FieldsetName extends keyof FieldValues & string
  >(
    name: FieldsetName,
    fieldsetDefaultValues: unknown
  ) => {
    const fieldsetAlreadyRegistered = form.fieldsets.some(
      (fieldset) => fieldset.name === name
    )

    if (fieldsetAlreadyRegistered) return

    const newFields: Array<Field & { fieldsetEntryId: string }> = []
    const newFieldsetFieldIds: string[] = []

    if (fieldsetDefaultValues && Array.isArray(fieldsetDefaultValues)) {
      let entryIndex = 0

      for (const entry of fieldsetDefaultValues as unknown[]) {
        const entryId = createUniqueId()

        if (entry && typeof entry === "object") {
          for (const [key, value] of Object.entries(entry)) {
            if (Array.isArray(value)) {
              const entryFieldDefaultValues =
                defaultValues &&
                findDefaultValue(defaultValues, `${name}.${entryIndex}.${key}`)

              processFieldsetDefaultValues(
                `${name}.${entryId}.${key}`,
                entryFieldDefaultValues
              )
            }

            newFields.push({
              name: `${name}.${entryId}.${key}`,
              controlled: false,
              inputRef: null,
              required: false,
              initialValue: value,
              fieldsetEntryId: entryId,
            })
          }
        } else {
          newFields.push({
            name: `${name}.${entryId}`,
            controlled: false,
            inputRef: null,
            required: false,
            initialValue: entry,
            fieldsetEntryId: entryId,
          })
        }

        entryIndex += 1
        newFieldsetFieldIds.push(entryId)
      }
    }

    setForm(
      produce((formState) => {
        if (newFields.length > 0) {
          formState.fields.push(...newFields)
        }

        formState.fieldsets.push({
          name,
          fields: newFieldsetFieldIds,
        })
      })
    )
  }

  const removeFieldsetField = (fieldsetName: string, fieldId: string) => {
    setForm(
      produce((formState) => {
        const fieldset = formState.fieldsets.find(
          (registeredFieldset) => registeredFieldset.name === fieldsetName
        )

        if (fieldset) {
          const fullFieldName = `${fieldsetName}.${fieldId}`

          const index = fieldset.fields.indexOf(fieldId)

          if (index !== -1) {
            fieldset.fields.splice(index, 1)
          }

          formState.fields = formState.fields.filter(
            (registeredField) => !registeredField.name.startsWith(fullFieldName)
          )

          formState.fieldsets = formState.fieldsets.filter(
            (registeredField) => !registeredField.name.startsWith(fullFieldName)
          )
        }
      })
    )
  }

  const useFieldset = <FieldsetName extends keyof FieldValues & string>(
    name: FieldNameFromPath<FieldValues, FieldsetName>
  ) => {
    const fieldsetDefaultValues =
      defaultValues && findDefaultValue(defaultValues, name)

    processFieldsetDefaultValues(name, fieldsetDefaultValues)

    return {
      fields: () => {
        debug("[use-form] searching for a fieldset", { name })

        return (
          form.fieldsets.find((fieldset) => fieldset.name === name)?.fields ??
          []
        )
      },

      append: () => {
        setForm(
          produce((formState) => {
            const fieldset = formState.fieldsets.find(
              (registeredFieldset) => registeredFieldset.name === name
            )

            if (fieldset) {
              const fieldId = createUniqueId()

              fieldset.fields.push(fieldId)
            }
          })
        )
      },

      remove: (fieldId: string) => removeFieldsetField(name, fieldId),

      move: (fromIndex: number, toIndex: number) => {
        setForm(
          "fieldsets",
          produce((fieldsets) => {
            const fieldset = fieldsets.find(
              (registeredFieldset) => registeredFieldset.name === name
            )

            if (fieldset) {
              if (
                toIndex === fromIndex ||
                toIndex < 0 ||
                toIndex >= fieldset.fields.length
              )
                return

              const [removed] = fieldset.fields.splice(fromIndex, 1)
              if (removed) {
                fieldset.fields.splice(toIndex, 0, removed)
              }
            }
          })
        )
      },
    }
  }

  const processFieldset = (
    fieldset: Fieldset,
    values: { [K in string]: unknown },
    processedFieldsets: string[],
    errors: { [K in string]: string },
    customName = fieldset.name
  ) => {
    if (processedFieldsets.includes(fieldset.name)) return

    values[customName] = []

    for (const fieldId of fieldset.fields) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let target: any = null

      const fullFieldName = `${fieldset.name}.${fieldId}`
      const fullFieldNameParts = fullFieldName.split(".")

      const fieldValues = unwrap(form.fields).filter((registeredField) =>
        registeredField.name.startsWith(fullFieldName)
      )

      for (const fieldValue of fieldValues) {
        const fieldValueParts = fieldValue.name.split(".")

        const distance = fieldValueParts.length - fullFieldNameParts.length

        const value = fieldValue.controlled
          ? fieldValue.controller?.[0]()
          : fieldValue.inputRef?.value ?? null

        const validateResult = validateFieldValue(fieldValue)

        if (validateResult) {
          errors[fieldValue.name] = validateResult
        }

        if (distance === 0) {
          target = value
        } else if (distance === 1) {
          if (!target) target = {} as Record<string, unknown>

          const normalizedName = fieldValue.name.slice(fullFieldName.length + 1)

          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          target[normalizedName] = value
        } else {
          debug(
            "[use-form] processing fieldset, found distance of >1! This is propably a sub-fieldset",
            { fieldset, fieldValue, fullFieldName }
          )
        }
      }

      if (target) {
        if (Array.isArray(values[customName])) {
          void (values[customName] as unknown[]).push(target)
        }

        const childFieldsets = unwrap(form.fieldsets).filter(
          (registeredFieldset) =>
            registeredFieldset.name.startsWith(fullFieldName) &&
            registeredFieldset.name.split(".").length -
              fullFieldNameParts.length ===
              1
        )

        for (const child of childFieldsets) {
          const normalizedName = child.name
            .split(".")
            .slice(fullFieldNameParts.length)
            .join(".")

          processFieldset(
            child,
            target as Record<string, unknown>,
            processedFieldsets,
            errors,
            normalizedName
          )
          processedFieldsets.push(child.name)
        }
      }
    }
  }

  const submit = (event?: Event) => {
    if (event) {
      event.preventDefault()
    }

    if (!onSubmit) return
    if (disabled && disabled()) return

    const values: Partial<Record<string, unknown>> = {}
    const processedFieldsets: string[] = []
    const errors: { [K in string]: string } = {}

    for (const field of unwrap(form.fields)) {
      const isFieldsetField = field.name.includes(".")

      if (!isFieldsetField) {
        const value = field.controlled
          ? field.controller?.[0]()
          : (field.inputRef?.type === "checkbox"
              ? field.inputRef.checked
              : field.inputRef?.value) ?? null

        const validateResult = validateFieldValue(field)

        if (validateResult) {
          errors[field.name] = validateResult
        }

        values[field.name] = value
      }
    }

    const sortedFieldsets = unwrap(form.fieldsets).sort((a, b) => {
      const aParts = a.name.split(".")
      const bParts = b.name.split(".")
      return aParts.length - bParts.length
    })

    for (const fieldset of sortedFieldsets) {
      processFieldset(fieldset, values, processedFieldsets, errors)
      processedFieldsets.push(fieldset.name)
    }

    if (Object.keys(errors).length === 0) {
      onSubmit(values as FieldValues)
    }

    setForm("fieldErrors", reconcile(errors))
  }

  const getValue = <
    FieldName extends string,
    FieldValue extends ValueFromPath<FieldValues, FieldName>
  >(
    fieldName: FieldNameFromPath<FieldValues, FieldName>
  ) => {
    const field = form.fields.find((f) => f.name === fieldName)

    if (!field) return null

    return (
      field.controlled
        ? field.controller?.[0]()
        : (field.inputRef?.type === "checkbox"
            ? field.inputRef.checked
            : field.inputRef?.value) ?? null
    ) as FieldValue | null
  }

  const setValue = <
    FieldName extends string,
    FieldValue extends ValueFromPath<FieldValues, FieldName>
  >(
    fieldName: FieldNameFromPath<FieldValues, FieldName>,
    value: FieldValue | ((currentValue: FieldValue) => FieldValue)
  ) => {
    const field = unwrap(form.fields).find(
      (registeredField) => registeredField.name === fieldName
    )

    if (field?.controlled && field.controller?.[1]) {
      const rawValue =
        typeof value === "function"
          ? (value as (currentValue: FieldValue) => FieldValue)(
              field.controller[0]() as FieldValue
            )
          : value

      field.controller[1](rawValue)
    } else if (field?.inputRef) {
      const rawValue =
        typeof value === "function"
          ? (value as (currentValue: FieldValue) => FieldValue)(
              field.inputRef.value as FieldValue
            )
          : value

      if (field.inputRef.type === "checkbox") {
        field.inputRef.checked = rawValue
        field.inputRef.dispatchEvent(new Event("change", { bubbles: true }))
      } else {
        field.inputRef.value = rawValue
      }

      field.inputRef.dispatchEvent(new Event("input"))
    }

    setForm(
      produce((formState) => {
        const isFieldset = unwrap(formState.fieldsets).find(
          (registeredFieldset) => registeredFieldset.name === fieldName
        )

        formState.fields = unwrap(formState.fields).filter(
          (registeredField) => !registeredField.name.startsWith(`${fieldName}.`)
        )

        formState.fieldsets = unwrap(formState.fieldsets).filter(
          (registeredFieldset) =>
            registeredFieldset.name !== fieldName &&
            !registeredFieldset.name.startsWith(`${fieldName}.`)
        )

        if (isFieldset) {
          processFieldsetDefaultValues(fieldName, value)
        }
      })
    )
  }

  const registerControlled = <FieldName extends keyof FieldValues & string>(
    name: FieldNameFromPath<FieldValues, FieldName>,
    options: FieldOptions = {}
  ) => {
    const defaultValue =
      defaultValues && findDefaultValue(defaultValues, name.split("."))

    // eslint-disable-next-line solid/reactivity
    const [fieldValue, setFieldValue] = createSignal(
      defaultValue as FieldName extends keyof FieldValues & string
        ? FieldValues[FieldName]
        : unknown
    )

    setForm(
      "fields",
      produce((fields) => {
        const field = fields.find(
          (registeredField) => registeredField.name === name
        )

        if (field) {
          if (field.initialValue) {
            setFieldValue(field.initialValue as FieldValues[FieldName & string])
          }

          field.controller = [fieldValue, setFieldValue as Setter<unknown>]
          field.controlled = true
          field.required = options.required ?? false
          field.validate = options.validate
        } else {
          fields.push({
            name,
            controller: [fieldValue, setFieldValue as Setter<unknown>],
            required: options.required ?? false,
            controlled: true,
            inputRef: null,
            validate: options.validate,
          })
        }
      })
    )

    return {
      name,

      value: fieldValue,
      onChange: setFieldValue,
    }
  }

  const errors = () => form.fieldErrors

  return {
    register: registerUncontrolled,
    registerControlled,
    watch: watchHandler,
    useFieldset,
    submit,
    setValue,
    getValue,
    errors,
  }
}
