import { Component } from "solid-js";

const FormFieldError: Component<{
    error: string | undefined;
}> = props => {
    return (
        <div
            hidden={ props.error === undefined }
            className="ui-input-message c-red"
        >
            { props.error }
        </div>
    )
}

export default FormFieldError;
