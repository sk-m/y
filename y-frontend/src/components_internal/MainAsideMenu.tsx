import { useNavigate } from "solid-app-router";
import { Component, createSignal, onMount, PropsWithChildren, Show } from "solid-js";
import AsideMenuLink from "../components/AsideMenuLink";
import AsideMenuSection from "../components/AsideMenuSection";
import DropdownMenu, { DropdownMenuLink } from "../components/DropdownMenu";
import { useCurrentUser } from "../stores/current_user";

const MainAsideMenu: Component = () => {
    const navigate = useNavigate();    
    const [current_user, { logout }] = useCurrentUser();
    
    const [isAsideSmall, setIsAsideSmall] = createSignal(false);
    const [isUserDropdownShown, setIsUserDropdownShown] = createSignal(false);

    const toggleUserDropdownMenu = () => setIsUserDropdownShown(v => !v);
    const toggleAsideSmall = () => setIsAsideSmall(v => !v);

    const user_dropdown_menu_props = { request_close: () => setIsUserDropdownShown(false) };

    // Allow toggling the size of the aside menu by pressing ctrl + B anywhere
    onMount(() => {
        // Just to be extra sure
        if((window as any)._y_aside_listener_added) return;
        (window as any)._y_aside_listener_added = true;

        // TODO @improvement save the state to the localStorage?
        window.document.body.addEventListener("keydown", e => {
            if(!e.repeat && e.ctrlKey && e.code === "KeyB") toggleAsideSmall()
        })
    });

    return (
        <div id="mainroute-aside-container" classList={{ "ui-aside-container": true, small: isAsideSmall() }}>
            <div className="aside">
                <div className="content">
                    <div className="userspace">
                        <Show when={ current_user.user } fallback={
                            <div className="main">
                                <div className="left">
                                    <div className="log-in-text">
                                        <span className="icon material-icons-round">person</span>
                                        <span className="text">You are not logged in</span>
                                    </div>
                                </div>
                                <div className="right">
                                    <div className="log-in-button" onclick={[ navigate, "/login" ]}>Log in</div>
                                </div>
                            </div>
                        }>
                            <div className="main">
                                <div className="left">
                                    <div className="user" onclick={ toggleUserDropdownMenu }>
                                        <div
                                            className="user-avatar"
                                            style={{ "background-image": "url(https://images.unsplash.com/photo-1604076913837-52ab5629fba9?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=687&q=80)" }}
                                        ></div>
                                        <div className="user-username">{ current_user.user!.user_username }</div>
                                        <span classList={{ "expand-icon": true, "material-icons-round": true, shown: isUserDropdownShown() }}>expand_less</span>
                                    </div>

                                    <DropdownMenu shown={ isUserDropdownShown() }>
                                        <DropdownMenuLink
                                            text="Profile"
                                            to={`/u/${ current_user.user!.user_username }`}

                                            { ...user_dropdown_menu_props }
                                            />
                                        <DropdownMenuLink
                                            text="User preferences"
                                            to={`/u/${ current_user.user!.user_username }/preferences`}

                                            { ...user_dropdown_menu_props }
                                            />
                                        <DropdownMenuLink
                                            text="Log out"
                                            is_red={true}
                                            
                                            action={ logout }

                                            { ...user_dropdown_menu_props }
                                        />
                                    </DropdownMenu>
                                </div>
                                <div className="right">
                                    <div className="notifications-container has-unread">
                                        <div className="notifications-count-container">
                                            <div className="count">43</div>
                                            <div className="icons">
                                                <span class="material-icons-round">warning</span>
                                                <span class="material-icons-round">question_mark</span>
                                                <span class="material-icons-round">north_east</span>
                                            </div>
                                        </div>
                                        <div className="notifications-icon">
                                            <div className="bubble"></div>
                                            <span class="material-icons-round">notifications</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Show>
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
                            <AsideMenuLink
                                icon_name="home"
                                name="Home"
                                description="Main wiki page"

                                to="/p/Main"
                            />
                            <AsideMenuLink
                                icon_name="hotel_class"
                                name="Welcome"
                                description="About our company"

                                to="/p/About"
                            />
                            <AsideMenuLink
                                icon_name="gavel"
                                name="Company rules"
                                description="Obey your master(s)!"
                                
                                to="/p/Rules"
                                />
                            <AsideMenuLink
                                icon_name="scatter_plot"
                                name="Our network setup"
                                description="For IT people"

                                to="/p/IT%20info"
                            />

                            <div className="menu-spacer"></div>

                            <AsideMenuLink
                                icon_name="dashboard"
                                name="Dashboard"
                                description="Instance status at a glance"
                                
                                needs_attention={true}
                                to="/dashboard"
                                />
                            <AsideMenuLink
                                icon_name="tune"
                                name="Config"
                                description="Instance configuration centre"
                                
                                to="/config"
                            />
                            
                            <AsideMenuSection name="Page actions" is_expanded={ true } >
                                <AsideMenuLink
                                    icon_name="show_chart"
                                    name="Information"

                                    is_small={true}

                                    to="/page-management/1/info"
                                    />
                                <AsideMenuLink
                                    icon_name="arrow_forward"
                                    name="Rename"
                                    
                                    is_small={true}
                                    to="/page-management/1/rename"
                                    />
                                <AsideMenuLink
                                    icon_name="remove_moderator"
                                    name="Manage access"
                                    
                                    is_small={true}

                                    to="/page-management/1/access"
                                    />
                                <AsideMenuLink
                                    icon_name="delete"
                                    name="Delete // archive"
                                    
                                    is_small={true}

                                    to="/page-management/1/delete"
                                />
                            </AsideMenuSection>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MainAsideMenu;

