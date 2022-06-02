import { Component, Match, Switch } from "solid-js";

const Button: Component<{
    text: string,

    type?: "primary" | "secondary",
    w_hint?: "submit" | "cancel",
    text_color?: "red",

    disabled?: boolean,

    // TODO @cleanup use the ...spread operator to pass the rest of the props into the <button>?
    // TODO @any
    onclick?: any,

    button_ref?: (ref: HTMLButtonElement) => void 
}> = props => {
    return (
        <div className="ui-button-container">
            <button
                ref={ props.button_ref }
                type="button"

                classList={{
                    "ui-button": true,
                    ["t-" + (props.type || "primary")]: true,
                    ["tc-" + (props.text_color || "default")]: true,
                    disabled: props.disabled
                }}
                onclick={ props.onclick }
            >
                { props.text }
            </button>
            <Switch>
                <Match when={ props.w_hint === "submit" }>
                    <div className="button-hint t-submit">
                        <div className="icon">
                            <span class="material-icons-round">done</span>
                        </div>
                        <div className="text">ctrl+return</div>
                    </div>
                </Match>
                <Match when={ props.w_hint === "cancel" }>
                    <div className="button-hint t-cancel">
                        <div className="icon">
                            <span class="material-icons-round">clear</span>
                        </div>
                        <div className="text">esc</div>
                    </div>
                </Match>
            </Switch>
        </div>
    )
}

export default Button;
