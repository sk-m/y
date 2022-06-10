import { Component, JSX, Show } from "solid-js";
import Button, { ButtonProps } from "./Button";
import FormFieldError from "./FormFieldError";

const Input: Component<{
    name: string;
    label?: string;

    type?: string;
    placeholder?: string;
    autocomplete?: string;

    with_button?: ButtonProps;

    /**
     * If set, will include an <FormFieldError /> element that will display this error text underneath the input element
     */
    error?: string;

    /**
     * Props that will be passed to the underlying <input> element
     */
    input_props?: JSX.InputHTMLAttributes<HTMLInputElement>;

    /**
     * This references the <input> element
     */
    ref?: (ref: HTMLInputElement) => void;

    /**
     * This references the .ui-input-container div container
     */
    container_ref?: (ref: HTMLDivElement) => void;
}> = props => {
    return (
        <div ref={ props.container_ref } classList={{ "ui-input-container": true, "w-button": !!props.with_button }}>
            <div className="header" hidden={ !props.label }>{ props.label }</div>
            <div className="input-wrapper">
                <div className="nav-hints-container">
                    <div className="item">
                        <span class="material-icons">expand_less</span>
                    </div>
                    <div className="item">
                        <span class="material-icons">expand_more</span>
                    </div>
                </div>
                <div className="horizontal-container">
                    <input
                        ref={ props.ref }
                        className="ui-input"

                        name={ props.name }
                        type={ props.type || "text" }
                        placeholder={ props.placeholder }

                        autocomplete={ props.autocomplete }

                        { ...(props.input_props || {}) }
                    />
                    <Show when={ props.with_button }>
                        <Button
                            is_adjacent={ true }

                            { ...props.with_button! }
                        />
                    </Show>
                </div>
            </div>
            <FormFieldError error={ props.error } />
        </div>
    )
}

export default Input;
