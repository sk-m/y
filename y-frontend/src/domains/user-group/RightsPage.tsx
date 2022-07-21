import { Component, For } from "solid-js";
import ConfigSectionHeader from "../config/common/ConfigSectionHeader";

import "./RightsPage.css"
import { FormattedUserRights } from "./UserGroupManagementDomain";
import { FullUserGroupAPIResponse } from "../../interfaces/usergroup";
import UserRightItem from "./UserRightItem";

const UsergroupDomainRightsPage: Component<{
    full_usergroup_info: FullUserGroupAPIResponse,
    formatted_user_rights: FormattedUserRights,
    initial_user_rights: Record<string, Record<string, unknown> | undefined>
}> = props => {
    console.log(props.initial_user_rights);

    return (
        <div id="usergroup-rights-page" className="ui-domain-page config-items-page">
            <div className="group-rights-container config-items-container">
                <For each={ Object.values(props.full_usergroup_info.userright.user_right_categories) }>{
                    (cat) => (
                        <div>
                            <ConfigSectionHeader
                                title={ cat.category_display_name }
                                description={ cat.category_description }

                                max_width="800px"
                            />

                            <For each={ Object.values(props.formatted_user_rights[cat.category_name] ?? {}) }>{
                                (right) => (
                                    <UserRightItem
                                        name={ right.user_right.right_name }
        
                                        display_name={ right.user_right.right_display_name }
                                        description={ right.user_right.right_description }
        
                                        is_granted={ right.$ui_state().is_assigned }
                                        set_is_granted={ (is_granted) => right.$ui_setState(s => ({...s, is_assigned: is_granted })) }

                                        is_dirty={ !!props.initial_user_rights[right.user_right.right_name] !== right.$ui_state().is_assigned }

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
