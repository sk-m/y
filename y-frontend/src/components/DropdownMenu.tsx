import { Component } from "solid-js";
import { useNavigate } from "solid-app-router";

import "./DropdownMenu.css";

export const DropdownMenuLink: Component<{
    text: string,

    is_red?: boolean,

    to?: string,

    // TODO @cleanup I do not like this approach!
    /**
     * function that gets executed when the menu decides it wants to close
     * 
     * ex. ```
     * <DropdownMenuLink on_close={ () => setIsDropdownMenuShown(false) } />
     * ```
     */
    request_close: () => void,

    /**
     * return `false` to trigger on_close() event  
     */
    action?: () => void | boolean
}> = props => {
    // TODO @performance is it ok that we do this for every Link?
    const navigate = useNavigate();

    const onLinkClick = () => {
        if(props.to) { navigate(props.to); props.request_close(); }
        else if(props.action) {
            if(props.action() === false) props.request_close();
        }
    }

    return (
        <div onclick={ onLinkClick } classList={{ "link": true, "c-red": props.is_red || false }}>
            <div class="left">
                {/* <div class={ styles.icon }>
                    <span class="material-icons-round">{ props.icon_name }</span>
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
