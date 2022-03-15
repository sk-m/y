import { Component, createSignal, PropsWithChildren, Show } from "solid-js";

const MenuLink: Component<{
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

const MenuSection: Component<{
    name: string,

    is_expanded?: boolean
}> = props => {
    const [isExpanded, setIsExpanded] = createSignal(props.is_expanded || false);

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

const MainAsideMenu: Component = () => {
    return (
        <div id="mainroute-aside-container">
            <div className="aside">
                <div className="content">
                    <div className="userspace">
                        <div className="main">
                            <div className="left">
                                <div className="user">
                                    <div
                                        className="user-avatar"
                                        style={{ "background-image": "url(https://images.unsplash.com/photo-1604076913837-52ab5629fba9?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=687&q=80)" }}
                                    ></div>
                                    <div className="user-username">admin</div>
                                </div>
                            </div>
                            <div className="right">
                                <div className="notifications-container has-unread">
                                    <div className="notifications-count-container">
                                        <div className="count">43</div>
                                        <div className="icons">
                                            <span class="material-icons">warning</span>
                                            <span class="material-icons">question_mark</span>
                                            <span class="material-icons">north_east</span>
                                        </div>
                                    </div>
                                    <div className="notifications-icon">
                                        <div className="bubble"></div>
                                        <span class="material-icons-round">notifications</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="misc">
                        <div className="search-container">
                            <div className="searchbar">
                                <input type="text" placeholder="Quick search..." />
                            </div>
                            <div className="link"><span class="material-icons-round">travel_explore</span></div>
                        </div>
                    </div>
                    <div className="menu">
                        <div className="links">
                            <MenuLink
                                icon_name="home"
                                name="Home"
                                description="Main page"
                            />
                            <MenuLink
                                icon_name="dashboard"
                                name="Dashboard"
                                description="Instance status at a glance"

                                needs_attention={true}
                                is_selected={true}
                            />
                            <MenuLink
                                icon_name="tune"
                                name="Settings"
                                description="Instance configuration centre"
                            />
                            
                            <MenuSection name="Page actions" is_expanded={ true } >
                                <MenuLink
                                    icon_name="show_chart"
                                    name="Information"

                                    is_selected={true}
                                    is_small={true}
                                />
                                <MenuLink
                                    icon_name="arrow_forward"
                                    name="Rename"

                                    is_small={true}
                                />
                                <MenuLink
                                    icon_name="remove_moderator"
                                    name="Manage access"

                                    is_small={true}
                                />
                                <MenuLink
                                    icon_name="delete"
                                    name="Delete // archive"

                                    is_small={true}
                                />
                            </MenuSection>

                            <MenuSection name="Another section">
                                <MenuLink
                                    icon_name="show_chart"
                                    name="Information"

                                    is_selected={true}
                                    is_small={true}
                                />
                                <MenuLink
                                    icon_name="arrow_forward"
                                    name="Rename"

                                    is_small={true}
                                />
                                <MenuLink
                                    icon_name="remove_moderator"
                                    name="Manage access"

                                    is_small={true}
                                />
                                <MenuLink
                                    icon_name="delete"
                                    name="Delete // archive"

                                    is_small={true}
                                />
                            </MenuSection>
                            
                            <MenuSection name="Section three">
                                <MenuLink
                                    icon_name="show_chart"
                                    name="Information"

                                    is_selected={true}
                                    is_small={true}
                                />
                                <MenuLink
                                    icon_name="arrow_forward"
                                    name="Rename"

                                    is_small={true}
                                />
                                <MenuLink
                                    icon_name="remove_moderator"
                                    name="Manage access"

                                    is_small={true}
                                />
                                <MenuLink
                                    icon_name="delete"
                                    name="Delete // archive"

                                    is_small={true}
                                />
                            </MenuSection>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MainAsideMenu;

