import { Component, Show } from "solid-js";

const AsideMenuLink: Component<{
    icon_name: string,
    name: string,
    description?: string,

    is_small?: boolean;

    is_selected?: boolean,
    needs_attention?: boolean
}> = props => {
    return (
        <div 
            classList={{ link: true, small: props.is_small, "is-selected": props.is_selected, "needs-attention": props.needs_attention }}
        >
            <div className="left">
                <div className="selection-indicator"></div>
                <div className="icon"><span class="material-icons-round">{ props.icon_name }</span></div>
                <div className="text-container">
                    <div className="name">{ props.name }</div>
                    <Show when={ !props.is_small && props.description }>
                        <div className="description">{ props.description }</div>
                    </Show>
                </div>
            </div>
            <div className="right">
                <div className="needs-attention-bubble"></div>
                <span class="arrow-icon material-icons-round">navigate_next</span>
            </div>
        </div>
    )
}

export default AsideMenuLink;
