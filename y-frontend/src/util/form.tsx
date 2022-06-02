import { batch, createSignal } from "solid-js";
import { createStore, produce } from "solid-js/store";

export type UseFormSubmitFunction = (
    values: {[field_name: string]: string | undefined},
    action_name: string,
    e: MouseEvent | undefined
) => Promise<unknown> | void;

interface UseFormInternalField extends UseFormField {
    ref: any | undefined;

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
    last_field?: boolean;
}

export function useForm(fields: { [field_name: string]: UseFormField }, form_options: UseFormOptions) {
    const _fields: {[field_name: string]: UseFormInternalField} = {};

    for(const field_name in fields) {
        _fields[field_name] = {
            ...fields[field_name],

            ref: undefined
        }
    }

    // TODO @refactor move into the store
    const [globalError, setGlobalError] = createSignal<string | undefined>();
    const [status, setStatus] = createSignal<"idle" | "fetching" | "success" | "error">("idle");

    const [formStore, setFormStore] = createStore<{
        fields: {[field_name: string]: UseFormInternalField},
        fields_order: string[],
        form_ref: HTMLFormElement | undefined
    }>({
        fields: _fields,
        fields_order: [],
        form_ref: undefined
    });

    // Functions that we return
    const registerFormHandler = (classList: {[className: string]: boolean} = { "ui-form": true }) => {
        return {
            classList,
            ref: (ref: HTMLFormElement) => {
                setFormStore("form_ref", ref as any);
            }
        }
    }

    const linkFieldHandler = (field_name: string, field_options: UseFormFieldLinkOptions = {}) => {
        let field_index: number | undefined = undefined;

        // TODO @performance
        setFormStore("fields_order", order => {
            field_index = order.length;
            return [...order, field_name];
        });

        return {
            name: field_name,
            ref: (ref: HTMLInputElement) => {
                // Just to be sure
                // TODO @cleanup we might not need this check
                if(!ref.hasAttribute("form-linked")) {
                    ref.setAttribute("form-linked", "");

                    const default_value = formStore.fields[field_name]?.default_value;
                    if(default_value) ref.value = default_value;

                    ref.addEventListener("input", () => {
                        if(formStore.fields[field_name]?.error) {
                            setFormStore("fields", field_name as any, "error", undefined);
                        }
                    });
                    
                    ref.addEventListener("keydown", (e) => {
                        if(e.repeat) return;

                        if(form_options.onCancel && e.key === "Escape") {
                            form_options.onCancel();
                        } else if(e.ctrlKey) {
                            if(field_index !== undefined) {
                                if(e.key === "ArrowUp") {
                                    const prev_field_name = formStore.fields_order[field_index - 1];
    
                                    if(prev_field_name) formStore.fields[prev_field_name].ref.focus();
                                }
    
                                else if(e.key === "ArrowDown") {
                                    const prev_field_name = formStore.fields_order[field_index + 1];
    
                                    if(prev_field_name) formStore.fields[prev_field_name].ref.focus();
                                }
                            }

                            else if(field_options.last_field && e.key === "Enter" && status() === "idle") {
                                submitHandler();
                            }
                        }
                    });

                    ref.addEventListener("focus", () => {
                        if(formStore.form_ref) {
                            formStore.form_ref.classList.add("form-hint-cancellable");

                            if(field_options.last_field) {
                                formStore.form_ref.classList.add("form-hint-submittable");
                            }
                        }
                    });

                    ref.addEventListener("blur", () => {
                        if(formStore.form_ref) {
                            formStore.form_ref.classList.remove("form-hint-cancellable");
                            formStore.form_ref.classList.remove("form-hint-submittable");
                        }
                    });

                    setFormStore("fields", field_name as any, "ref", ref);
                }
            }
        }
    }

    const submitHandler = (e?: MouseEvent, action_name: string = "submit") => {
        const values: {[field_name: string]: string | undefined} = {};
        const errors: {[field_name: string]: string } = {};

        let is_error = false;

        for(const field_name in formStore.fields) {
            const field = formStore.fields[field_name];
            const field_value = field.ref?.value;
 
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
                    setFormStore("fields", field_name as any, "error", errors[field_name]);
                    is_error = true;
                } else {
                    setFormStore("fields", field_name as any, "error", undefined);
                }
            }
        });

        if(is_error) return;

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
            })
            .catch((error: Error) => {
                batch(() => {
                    setStatus("error");
                    setGlobalError(error.message);
                });

                if(form_options.onError) form_options.onError(error.message);
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

        error_out: (error: string) => { setGlobalError(error) },
        submit: submitHandler,
    };
}
