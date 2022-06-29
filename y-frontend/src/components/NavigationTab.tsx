import { Link, useLocation, useNavigate } from "solid-app-router";
import { Component, createEffect, createSignal } from "solid-js";

const NavigationTab: Component<{
    label: string;
    href: string;
}> = props => {
    const location = useLocation();

    const [isRouteActive, setIsRouteActive] = createSignal(false);

    // TODO @performance I think there is a better way of doing this
    createEffect(() => {
        if(props.href) {
            setIsRouteActive(location.pathname.endsWith(props.href));
        }
    }, location.pathname);

    return (
        <Link
            href={ props.href }
            classList={{ "ui-navigation-tab": true, "active": isRouteActive() }}
        >
            <div className="label">{ props.label }</div>
            <div className="line"></div>
        </Link>
    )
}

export default NavigationTab;
