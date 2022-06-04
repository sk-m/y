import { Component, JSX } from "solid-js";
import FormFieldError from "./FormFieldError";

const Input: Component<{
    label: string;
    name: string;

    type?: string;
    placeholder?: string;
    autocomplete?: string;

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
        <div ref={ props.container_ref } className="ui-input-container">
            <div className="header">{ props.label }</div>
            <div className="input-wrapper">
                <div className="nav-hints-container">
                    <div className="item">
                        <span class="material-icons">expand_less</span>
                    </div>
                    <div className="item">
                        <span class="material-icons">expand_more</span>
                    </div>
                </div>
                <input
                    ref={ props.ref }
                    className="ui-input"

                    name={ props.name }
                    type={ props.type || "text" }
                    placeholder={ props.placeholder }

                    autocomplete={ props.autocomplete }

                    { ...(props.input_props || {}) }
                />
            </div>
            <FormFieldError error={ props.error } />
        </div>
    )
}

export default Input;
