import { Component } from "solid-js";
import { useNavigate } from "solid-app-router";

import "./DropdownMenu.css";

export const DropdownMenuLink: Component<{
    text: string,

    is_red?: boolean,

    to?: string,
    action?: () => void
}> = props => {
    // TODO @performance is it ok that we do this for every Link?
    const navigate = useNavigate();

    const onLinkClick = () => {
        if(props.to) navigate(props.to);
        else { props.action && props.action() };
    }

    return (
        <div onclick={ onLinkClick } classList={{ "link": true, "c-red": props.is_red || false }}>
            <div class="left">
                {/* <div class={ styles.icon }>
                    <span class="material-icons">{ props.icon_name }</span>
                </div> */}
                <div class="text">{ props.text }</div>
            </div>
            <div class="right"></div>
        </div>
    )
}

const DropdownMenu: Component<{
    shown?: boolean
}> = props => {
    return (
        <div classList={{ "ui-dropdown-menu-container": true, shown: props.shown }}>
            <div class="ui-dropdown-menu">
                <div class="links">
                    { props.children }
                </div>
            </div>
        </div>
    )
}

export default DropdownMenu;
