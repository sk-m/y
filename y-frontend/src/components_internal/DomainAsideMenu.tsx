import { Link } from "solid-app-router";
import { Component, createSignal, For, Show } from "solid-js";

interface DomainAsideMenuBackLink {
    text: string;
    href: string;
}

const DomainAsideMenu: Component<{
    domain_id: string,

    header: string,
    subheader: string,
    
    target_name?: string,
    target_info?: Record<string, string | number | boolean>[],

    back_link?: DomainAsideMenuBackLink,
}> = props => {
    // We store whether or not the target info panel for this specific domain is expanded, in the localStorage
    const target_panel_localstorage_config_key = "y_domain_aside_target_panel_expanded_" + props.domain_id;
    const y_domain_aside_target_panel_expanded_raw = window.localStorage.getItem(target_panel_localstorage_config_key);

    const target_panel_default_state = y_domain_aside_target_panel_expanded_raw === "1"
                                    || y_domain_aside_target_panel_expanded_raw === null;
    // --- --- ---

    const [isTargetPanelExpanded, setIsTargetPanelExpanded] = createSignal(target_panel_default_state);

    const toggleTargetPanel = () => setIsTargetPanelExpanded(v => {
        window.localStorage.setItem(target_panel_localstorage_config_key, !v ? "1" : "0");

        return !v;
    });

    return (
        <div className="ui-aside-container domain-aside-container">
            <div className="aside">
                <div className="content">
                    <div className="domain-header">
                        <div className="left-line"></div>
                        <div className="content">
                            <div className="header">
                                {/* <div className="icon">
                                    <span class="material-icons-round">face</span>
                                </div> */}
                                <div className="text">{ props.header }</div>
                            </div>
                            <div className="subheader">{ props.subheader }</div>
                            <Show when={ props.target_name }>
                                <div className="target-name">
                                    {/* <div className="icon">
                                        <span class="material-icons-round">arrow_right</span>
                                    </div> */}
                                    <div className="text">{ props.target_name }</div>
                                </div>
                            </Show>
                        </div>
                    </div>
                    <Show when={ props.target_info }>
                        <div className="domain-target-info">
                            <div className="panel" onclick={ toggleTargetPanel }>
                                <div className="panel-header">Target</div>
                                <div classList={{ "panel-content": true, "expanded": isTargetPanelExpanded() }}>
                                    <For each={ props.target_info }>
                                        { item => (
                                            <div className="item">
                                                <div className="key">
                                                    <div className="dot"></div>
                                                    { item.key }:
                                                </div>
                                                <div classList={{
                                                    value: true,
                                                    "bool-true": item.value === (!item.inverse_bool),
                                                    "bool-false": item.value === (item.inverse_bool)
                                                }}>{
                                                    (typeof item.value === "boolean")
                                                    ? (item.value ? "yes" : "no")
                                                    : item.value
                                                }</div>
                                            </div>
                                        ) }
                                    </For>
                                </div>
                            </div>
                        </div>
                    </Show>
                    <Show when={props.back_link}>
                        <div className="back-link-container">
                            {/* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */}
                            <Link href={ props.back_link!.href } className="back-link">
                                <span class="material-icons-round">chevron_left</span>
                                {/* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */}
                                { props.back_link!.text }
                            </Link>
                        </div>
                    </Show>
                    <div className="aside-arrow-spacer">
                        <span class="material-icons">expand_more</span>
                    </div>
                    <div className="menu">
                        <div className="links">
                            { props.children }
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default DomainAsideMenu;
