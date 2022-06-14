import { Component } from "solid-js";
import ConfigSectionHeader from "./common/ConfigSectionHeader";
import UserRightItem from "./usergroupmanagement-page/UserRightItem";

const UserGroupManagementPage: Component = props => {
    return (
        <div id="config-usergroup-page" className="ui-domain-page config-items-page">
            <div className="rights-container config-items-container">
                <div>
                    <ConfigSectionHeader
                        title="Basic"
                        description="Common rights probably everyone should have. You might still want to get rid of some of them, if you\
                        want this instance to be very restricted."

                        max_width="700px"
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
        </div>
    )
} 

export default UserGroupManagementPage;
