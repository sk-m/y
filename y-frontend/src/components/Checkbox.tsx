import { Component, Show } from "solid-js";

const Checkbox: Component<{
    onclick?: () => void;

    checked?: boolean;

    checked_hint?: string;
}> = props => {
    return (
        <div classList={{ "ui-checkbox-container": true, checked: props.checked }}>
            <div
                classList={{ "ui-checkbox": true, checked: props.checked }}

                onclick={ props.onclick }
            >
                <div className="tick">
                    <span class="material-icons">done</span>
                </div>
            </div>

            <Show when={ props.checked_hint }>
                <div className="value-hint">{ props.checked_hint }</div>
            </Show>
        </div>
    )
}

export default Checkbox;
