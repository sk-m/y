import { Component, createSignal, For, Show } from "solid-js";
import { Portal } from "solid-js/web";
import DropdownMenu, { DropdownMenuLink } from "./DropdownMenu";

export interface PanelAction {
    name: string,
    text: string,
    
    action: () => boolean | void
}

export const PanelDrawer: Component<{
    panel_ref: HTMLDivElement | undefined
}> = props => {
    return (
        <Portal mount={ props.panel_ref }>
            <div className="ui-panel-drawer">
                { props.children }
            </div>
        </Portal>
    )
} 

const Panel: Component<{
    classList?: any,

    panel_ref?: (ref: HTMLDivElement) => void,

    drawer_shown?: boolean,
    panel_actions?: PanelAction[]
}> = props => {
    const [isActionsDropdownShown, setIsActionsDropdownShown] = createSignal(false);

    const toggleActionsDropdownShown = () => setIsActionsDropdownShown(v => !v);

    return (
        <div ref={ props.panel_ref } classList={{ "ui-panel-container": true, "drawer-shown": props.drawer_shown }}>
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

                                    request_close={ () => setIsActionsDropdownShown(false) }
                                />
                            ) }</For>
                        </DropdownMenu>
                    </div>
                </Show>
                <div className="content">
                    { props.children }
                </div>
            </div>
        </div>
    )
}

export default Panel;
