import { Component, createSignal, For, Show } from "solid-js";

const DomainAsideMenu: Component<{
    header: string,
    subheader: string,

    target_info?: { [key: string]: string | number | boolean }[]
}> = props => {
    const [isTargetPanelExpanded, setIsTargetPanelExpanded] = createSignal(true);

    const toggleTargetPanel = () => setIsTargetPanelExpanded(v => !v);

    return (
        <div id="domain-aside-container" class="ui-aside-container">
            <div className="aside">
                <div className="content">
                    <div className="domain-header">
                        <div className="left-line"></div>
                        <div className="content">
                            <div className="header">
                                {/* <div className="icon">
                                    <span class="material-icons">face</span>
                                </div> */}
                                <div className="text">{ props.header }</div>
                            </div>
                            <div className="subheader">{ props.subheader }</div>
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
                                                <div className="dot"></div>
                                                <div className="key">{ item.key }:</div>
                                                <div classList={{
                                                    value: true,
                                                    "bool-true": item.value === true,
                                                    "bool-false": item.value === false
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
