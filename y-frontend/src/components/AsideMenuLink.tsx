import { useLocation, useNavigate } from "solid-app-router";
import { Component, createEffect, createSignal, Show } from "solid-js";

// TODO @improvement we require props.to to be an *absolute path* in order to determine whether or not it is active (blue line on the left
// of the link). It would be much nicer to allow using relative paths in props.to
const AsideMenuLink: Component<{
    icon_name: string,
    name: string,
    description?: string,

    to: string,

    is_small?: boolean;

    needs_attention?: boolean
}> = props => {
    const navigate = useNavigate();
    const location = useLocation();

    const [isRouteActive, setIsRouteActive] = createSignal(false);

    // TODO @performance I think there is a better way of doing this
    createEffect(() => {
        setIsRouteActive(location.pathname.startsWith(props.to));
    }, location.pathname);

    return (
        <div 
            classList={{ link: true, small: props.is_small, "is-selected": isRouteActive(), "needs-attention": props.needs_attention }}
            onclick={[ navigate, props.to ]}
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
