import { Component, createSignal, For, Show } from "solid-js";
import { classList } from "solid-js/web";
import DropdownMenu, { DropdownMenuLink } from "./DropdownMenu";

export interface PanelAction {
    name: string,
    text: string,
    
    action: () => void
}

const Panel: Component<{
    classList?: any,

    panel_actions?: PanelAction[]
}> = props => {
    const [isActionsDropdownShown, setIsActionsDropdownShown] = createSignal(false);

    const toggleActionsDropdownShown = () => setIsActionsDropdownShown(v => !v);

    return (
        <div classList={{ "ui-panel": true, ...props.classList }}>
            <Show when={ props.panel_actions }>
                <div className="actions-container">
                    <div className="actions-dropdown-button" onclick={ toggleActionsDropdownShown }>
                        <span class="material-icons">{ isActionsDropdownShown() ? "expand_less" : "more_horiz" }</span>
                    </div>

                    <DropdownMenu shown={ isActionsDropdownShown() }>
                        <For each={ props.panel_actions }>{ action => (
                            <DropdownMenuLink
                                text={ action.text }
                                action={ action.action }
                            />
                        ) }</For>
                    </DropdownMenu>
                </div>
            </Show>
            <div className="content">
                { props.children }
            </div>
        </div>
    )
}

export default Panel;
