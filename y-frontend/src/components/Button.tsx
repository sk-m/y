import { Component, JSX, Match, Switch } from "solid-js";

export interface ButtonProps {
    text: string;

    /**
     * Only affects how the button looks
     */
    type?: "primary" | "filled";
    is_adjacent?: boolean;
    hint?: "submit" | "cancel";

    // TODO @refactor rename to `color`
    text_color?: "default" | "red";

    disabled?: boolean;

    onclick?: MouseEventHandler;

    /**
     * Props that will be passed to the underlying <button> element
     */
    button_props?: JSX.ButtonHTMLAttributes<HTMLButtonElement>;

    /**
     * This references the <button> element
     */
    ref?: (ref: HTMLButtonElement) => void;

    /**
     * This references the .ui-button-container div container
     */
    container_ref?: (ref: HTMLDivElement) => void;
}

const Button: Component<ButtonProps> = props => {
    return (
        <div ref={ props.container_ref } className="ui-button-container">
            <button
                ref={ props.ref }
                type="button"

                classList={{
                    "ui-button": true,
                    ["t-" + (props.type ?? "primary")]: true,
                    ["tc-" + (props.text_color ?? "default")]: true,
                    adjacent: props.is_adjacent,
                    disabled: props.disabled
                }}

                onclick={ props.onclick }

                {...(props.button_props ?? {})}
            >
                { props.text }
            </button>
            <Switch>
                <Match when={ props.hint === "submit" }>
                    <div className="button-hint t-submit">
                        <div className="icon">
                            <span class="material-icons-round">done</span>
                        </div>
                        <div className="text">ctrl+return</div>
                    </div>
                </Match>
                <Match when={ props.hint === "cancel" }>
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
