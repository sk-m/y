import { Component, For } from "solid-js";
import ConfigSectionHeader from "../config/common/ConfigSectionHeader";
import UserRightItem from "./UserRightItem";

import "./RightsPage.css"
import { FormattedUserRights } from "./UserGroupManagementDomain";
import { FullUserGroupAPIResponse } from "../../interfaces/usergroup";

const UsergroupDomainRightsPage: Component<{
    full_usergroup_info: FullUserGroupAPIResponse,
    formatted_user_rights: FormattedUserRights,
}> = props => {
    return (
        <div id="usergroup-rights-page" className="ui-domain-page config-items-page">
            <div className="group-rights-container config-items-container">
                <For each={ Object.entries(props.full_usergroup_info.userright.user_right_categories) }>{
                    ([_index, cat]) => (
                        <div>
                            <ConfigSectionHeader
                                title={ cat.category_display_name }
                                description={ cat.category_description }

                                max_width="800px"
                            />

                            <For each={ Object.entries(props.formatted_user_rights[cat.category_name] ?? {}) }>{
                                ([_index, right]) => (
                                    <UserRightItem
                                        name={ right.right_name }
        
                                        display_name={ right.right_display_name }
                                        description={ right.right_description }
        
                                        // inherited_from="everyone"
                                    />
                                )
                            }</For>
                        </div>
                    )
                }</For>
            </div>                        
        </div>
    )
} 

export default UsergroupDomainRightsPage;
