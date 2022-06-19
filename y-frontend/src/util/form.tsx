import { batch, createSignal } from "solid-js";
import { createStore, } from "solid-js/store";
import { APIError } from "./api_util";

export type UseFormSubmitFunction = (
    values: Record<string, string | undefined>,
    action_name: string,
    e: MouseEvent | undefined
) => Promise<unknown> | void;

interface UseFormInternalField extends UseFormField {
    ref: HTMLInputElement | undefined;
    container_ref: HTMLInputElement | undefined;

    error?: string;
}

interface UseFormField {
    default_value?: string;

    optional?: boolean;

    max_length?: number;
    min_length?: number;

    // regex?: RegExp;
}

interface UseFormOptions {
    /**
     * Will get called once you call `submit` that was provided by `useForm`
     */
    onSubmit: UseFormSubmitFunction;

    /**
     * Will get called upon successful `onSubmit` resolve
     */
    onSuccess?: (data: unknown) => void;

    /**
     * Will get called upon `onSubmit` rejection
     */
    onError?: (error_message: string) => void;

    /**
     * Will get called when user presses `Escape`
     */
    onCancel?: () => void;
}

interface UseFormFieldLinkOptions {
    /**
     * If true - focusing on this field will show the hint on the submit button
     */
    submittable_field?: boolean;
}

export function useForm(fields: Record<string, UseFormField>, form_options: UseFormOptions) {
    const _fields: Record<string, UseFormInternalField> = {};

    for(const field_name in fields) {
        _fields[field_name] = {
            ...fields[field_name],

            ref: undefined,
            container_ref: undefined
        }
    }

    // TODO @refactor move into the store
    const [globalError, setGlobalError] = createSignal<APIError | undefined>();
    const [status, setStatus] = createSignal<"idle" | "fetching" | "success" | "error">("idle");

    const [formStore, setFormStore] = createStore<{
        fields: Record<string, UseFormInternalField>,
        fields_order: string[],
        form_ref: HTMLFormElement | undefined
    }>({
        fields: _fields,
        fields_order: [],
        form_ref: undefined
    });

    // Functions that we return
    const registerFormHandler = (classList: Record<string, boolean> = { "ui-form": true }) => {
        return {
            classList,
            ref: (ref: HTMLFormElement) => {
                setFormStore("form_ref", ref);
            }
        }
    }

    const linkFieldHandler = (field_name: string, field_options: UseFormFieldLinkOptions = {}) => {
        return {
            name: field_name,
            error: formStore.fields[field_name].error,
            container_ref: (container_ref: HTMLDivElement) => {
                setFormStore("fields", field_name, "container_ref", container_ref);
            },
            ref: (ref: HTMLInputElement) => {
                // Just to be sure
                // TODO @cleanup we might not need this check
                if(!ref.hasAttribute("form-linked")) {
                    ref.setAttribute("form-linked", "");

                    const this_field_store = formStore.fields[field_name];

                    let field_index: number | undefined = undefined;

                    // TODO @performance
                    setFormStore("fields_order", order => {
                        field_index = order.length;
                        return [...order, field_name];
                    });

                    const default_value = this_field_store.default_value;
                    if(default_value) ref.value = default_value;

                    ref.addEventListener("input", () => {
                        if(this_field_store.error) {
                            setFormStore("fields", field_name, "error", undefined);
                        }
                    });

                    ref.addEventListener("keyup", (e) => {
                        if(e.key === "Control") this_field_store.container_ref?.classList.remove("container-hints-nav");
                    });

                    ref.addEventListener("keydown", (e) => {
                        if(e.repeat) return;

                        if(e.key === "Escape" && form_options.onCancel) {
                            form_options.onCancel();
                        } else if(e.ctrlKey) {
                            this_field_store.container_ref?.classList.add("container-hints-nav");

                            if(field_index !== undefined) {
                                if(e.key === "ArrowUp") {
                                    const prev_field_name = formStore.fields_order[field_index - 1];

                                    if(prev_field_name) {
                                        const prev_field = formStore.fields[prev_field_name];

                                        prev_field.ref?.focus();
                                        prev_field.container_ref?.classList.add("container-hints-nav");
                                    }

                                    return;
                                }

                                if(e.key === "ArrowDown") {
                                    const next_field_name = formStore.fields_order[field_index + 1];

                                    if(next_field_name) {
                                        const next_field = formStore.fields[next_field_name];

                                        next_field.ref?.focus();
                                        next_field.container_ref?.classList.add("container-hints-nav");
                                    }

                                    return;
                                }
                            }

                            if(field_options.submittable_field && e.key === "Enter" && status() === "idle") {
                                submitHandler();
                            }
                        }
                    });

                    ref.addEventListener("focus", () => {
                        if(formStore.form_ref) {
                            formStore.form_ref.classList.add("form-hint-cancellable");

                            if(field_options.submittable_field) {
                                formStore.form_ref.classList.add("form-hint-submittable");
                            }
                        }
                    });

                    ref.addEventListener("blur", () => {
                        this_field_store.container_ref?.classList.remove("container-hints-nav");

                        if(formStore.form_ref) {
                            formStore.form_ref.classList.remove("form-hint-cancellable");
                            formStore.form_ref.classList.remove("form-hint-submittable");
                        }
                    });

                    setFormStore("fields", field_name, "ref", ref);
                }
            }
        }
    }

    const submitHandler = (e?: MouseEvent, action_name = "submit") => {
        if(status() === "fetching") return;

        const values: Record<string, string | undefined> = {};
        const errors: Record<string, string> = {};

        for(const field_name in formStore.fields) {
            const field = formStore.fields[field_name];

            if(!field.ref) {
                console.error(`[y] useForm's submit handler could not determine the ref of field ${ field_name }.`);
                continue;
            }

            const field_value = field.ref.value;

            if(!field_value) {
                if(!field.optional) errors[field_name] = "This field is required.";
            } else {
                if(field.max_length !== undefined && field_value.length > field.max_length)
                errors[field_name] = `This field's maximum length is ${ field.max_length }.`;

                if(field.min_length !== undefined && field_value.length < field.min_length)
                errors[field_name] = `This field's minimum length is ${ field.min_length }.`;
            }

            values[field_name] = field_value;
        }

        batch(() => {
            for(const field_name in formStore.fields) {
                if(errors[field_name]) {
                    setFormStore("fields", field_name, "error", errors[field_name]);
                } else {
                    setFormStore("fields", field_name, "error", undefined);
                }
            }
        });

        if(Object.keys(errors).length) return;

        batch(() => {
            setGlobalError();
            setStatus("fetching");
        });

        const res = form_options.onSubmit(values, action_name, e);

        if(res) {
            res
            .then(data => {
                setStatus("success");
    
                if(form_options.onSuccess) form_options.onSuccess(data);
    
                return true;
            })
            .catch((error: Error) => {
                batch(() => {
                    setStatus("error");
                    setGlobalError({ error_message: error.message });
                });
    
                if(form_options.onError) form_options.onError(error.message);
    
                return false;
            });
        } else {
            setStatus("idle");
        }
    }

    return {
        fields: formStore.fields,
        global_error: globalError,
        status,

        register_form: registerFormHandler,
        link: linkFieldHandler,

        error_out: (error_message: string) => { setGlobalError({ error_message }) },
        submit: submitHandler,
    };
}
