import type { Component, PropsWithChildren } from "solid-js";

const MenuLink: Component<{
    icon_name: string,
    name: string,
    description: string,

    is_selected?: boolean,
    needs_attention?: boolean
}> = props => {
    return (
        <div 
            classList={{ link: true, "is-selected": props.is_selected, "needs-attention": props.needs_attention }}
        >
            <div className="left">
                <div className="selection-indicator"></div>
                <div className="icon"><span class="material-icons-round">{ props.icon_name }</span></div>
                <div className="text-container">
                    <div className="name">{ props.name }</div>
                    <div className="description">{ props.description }</div>
                </div>
            </div>
            <div className="right">
                <div className="needs-attention-bubble"></div>
                <span class="arrow-icon material-icons-round">navigate_next</span>
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
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MainAsideMenu;

