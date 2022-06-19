import { Component, createSignal } from "solid-js";

const AsideMenuSection: Component<{
    name: string,

    is_expanded?: boolean
}> = props => {
    const [isExpanded, setIsExpanded] = createSignal(props.is_expanded ?? false);

    const toggleSection = () => setIsExpanded(v => !v);

    return (
        <div classList={{ "menu-section": true, "is-expanded": isExpanded() }}>
            <div className="section-header" onclick={ toggleSection }>
                <div className="left">
                    <div className="menu-section-shape"></div>
                    <div className="name">{ props.name }</div>
                </div>
                <div className="right">
                    <div className="expand-icon">
                        <span class="material-icons-round">expand_more</span>
                    </div>
                </div>
            </div>
            <div classList={{ "section-contents": true }}>
                { props.children }
            </div>
        </div>
    )
}

export default AsideMenuSection;
