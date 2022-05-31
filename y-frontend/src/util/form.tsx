import { batch, createSignal } from "solid-js";
import { createStore } from "solid-js/store";

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
}

export function useForm(fields: { [field_name: string]: UseFormField }, options: UseFormOptions) {
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
    }>({
        fields: _fields,
    });

    // Functions that we return
    const linkFieldHandler = (field_name: string) => {
        return {
            name: field_name,
            ref: (ref: HTMLInputElement) => {
                const default_value = formStore.fields[field_name]?.default_value;
                if(default_value) ref.value = default_value;

                // Just to be sure
                if(!ref.hasAttribute("form-linked")) {
                    ref.addEventListener("input", () => {
                        if(formStore.fields[field_name]?.error) {
                            setFormStore("fields", field_name as any, "error", undefined);
                        }
                    });

                    ref.setAttribute("form-linked", "");
                }

                setFormStore("fields", field_name as any, "ref", ref);
            }
        }
    }

    const submitHandler = (e: MouseEvent | undefined, action_name: string = "submit") => {
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

        const res = options.onSubmit(values, action_name, e);

        if(res) {
            res
            .then(data => {
                setStatus("success");

                if(options.onSuccess) options.onSuccess(data);
            })
            .catch((error: Error) => {
                batch(() => {
                    setStatus("error");
                    setGlobalError(error.message);
                });

                if(options.onError) options.onError(error.message);
            });
        } else {
            setStatus("idle");
        }
    }
    
    return {
        fields: formStore.fields,
        global_error: globalError,
        status,

        link: linkFieldHandler,

        error_out: (error: string) => { setGlobalError(error) },
        submit: submitHandler,
    };
}
