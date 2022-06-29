import { Link, Route, Router, Routes } from "solid-app-router";
import { Component } from "solid-js";
import AsideMenuLink from "../../components/AsideMenuLink";
import NavigationTab from "../../components/NavigationTab";
import ConfigSectionHeader from "./common/ConfigSectionHeader";
import UserRightItem from "./usergroupmanagement-page/UserRightItem";

const UserGroupManagementPage: Component = () => {
    return (
        <div id="config-usergroup-page" className="ui-domain-page two-sides config-items-page">
            <div className="info-side">
                <div className="nav-links">
                    <Link className="link" href="/config/user-groups">
                        <span class="material-icons-round">navigate_before</span>
                        Back to user groups
                    </Link>
                </div>
                <div className="panels">
                    <div className="panel aside-usergroup-info">
                        <div className="group-display-name">
                            Administrator
                        </div>

                        <div className="group-internal-name">
                            admin
                        </div>

                        <div className="status-items">
                            <div className="ui-status-text">
                                <div className="line"></div>
                                <div className="text">5 users in this group</div>
                            </div>
                            <div className="ui-status-text red">
                                <div className="line"></div>
                                {/* <div className="line w-icon">
                                    <span class="material-icons-round">priority_high</span>
                                </div> */}
                                <div className="text">Group includes dangerous rights</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="splitter">
                <span class="material-icons-round">navigate_next</span>
            </div>
            <div className="content-side">
                <div className="ui-flex ui-between mb-1">
                    <div className="ui-flex">
                        <NavigationTab
                            label="Rights"
                            href="rights"
                        />
                        <NavigationTab
                            label="Management"
                            href="management"
                        />
                    </div>
                    <div className="ui-flex">
                        <NavigationTab
                            label="Danger zone"
                            href="danger-zone"
                        />
                    </div>
                </div>

                <div style={{ "min-width": "800px" }}>
                    <Routes>
                        <Route path="rights" element={
                            <div className="group-rights-container config-items-container">
                                <div>
                                    <ConfigSectionHeader
                                        title="Basic"
                                        description="Common rights probably everyone should have. You might still want to get rid of some of them, if you\
                                want this instance to be very restricted."

                                        max_width="800px"
                                    />

                                    <UserRightItem
                                        name="account_create"

                                        display_name="Create new accounts"
                                        description="Allow creating new accounts"

                                        inherited_from="everyone"
                                    />

                                    <UserRightItem
                                        name="account_change_password"

                                        display_name="Change own password"
                                        description="Allow changing own password"

                                        inherited_from="user"
                                    />
                                </div>
                            </div>                        
                        }></Route>
                    </Routes>
                </div>
            </div>
        </div>
    )
} 

export default UserGroupManagementPage;
