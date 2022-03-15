import { Component } from "solid-js";
import { useNavigate } from "solid-app-router";

import styles from "./DropdownMenu.module.css";

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
        <div onclick={ onLinkClick } classList={{ [styles.link]: true, [styles.c_red]: props.is_red }}>
            <div class={ styles.left }>
                {/* <div class={ styles.icon }>
                    <span class="material-icons">{ props.icon_name }</span>
                </div> */}
                <div class={ styles.text }>{ props.text }</div>
            </div>
            <div class={ styles.right }></div>
        </div>
    )
}

const DropdownMenu: Component<{
    shown?: boolean
}> = props => {
    return (
        <div classList={{ [styles.dropdown_menu_container]: true, [styles.shown]: props.shown }}>
            <div class={ styles.dropdown_menu }>
                <div class={ styles.links }>
                    { props.children }
                </div>
            </div>
        </div>
    )
}

export default DropdownMenu;
