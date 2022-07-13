import { Component, createSignal } from "solid-js";
import { Route, Routes, useLocation, useParams } from "solid-app-router";
import DomainAsideMenu from "../../components_internal/DomainAsideMenu";
import AsideMenuLink from "../../components/AsideMenuLink";

import UsergroupDomainRightsPage from "./RightsPage";
import UsergroupDomainDetailsPage from "./DetailsPage";
import { DomainCache } from "../../util/domain_util";
import { UserGroup } from "../../interfaces/usergroup";

const UserGroupManagementDomain: Component = () => {
    const params = useParams();
    const location = useLocation<{ usergroup: UserGroup } | undefined>();

    // We might get the details about this usergroup from a previous route (like AllGroupsListPage).
    // If that is the case - use that data instead of querying an api
    const state_usergroup = location.state?.usergroup;

    const [userGroupDetailsCache, setUserGroupDetailsCache] = createSignal<DomainCache<UserGroup>>([
        /* source:          */  state_usergroup ? state_usergroup.group_name : null,
        /* resource (data): */  state_usergroup
    ]);

    return (
        <div id="domain-usergroup" className="ui-domain">
            <DomainAsideMenu
                domain_id="usergroup"

                header="User group"
                subheader="User group management"

                target_name={ params.group_name }
            
                back_link={{
                    text: "All groups",
                    href: "/user-groups"
                }}
            >
                <AsideMenuLink
                    icon_name="checklist"
                    name="Group rights"
                    description="Assigned rights"

                    to={`/user-groups/${ params.group_name }/rights`}
                />
                <AsideMenuLink
                    icon_name="settings"
                    name="Details"
                    description="Edit the group details"

                    to={`/user-groups/${ params.group_name }/details`}
                />

                <div className="menu-spacer"></div>

                <AsideMenuLink
                    icon_name="supervisor_account"
                    name="Users list"
                    description="List of users in this group"

                    to={`/user-groups/${ params.group_name }/users`}
                />
            </DomainAsideMenu>
            
            <Routes>
                <Route path="/rights" element={
                    <UsergroupDomainRightsPage />
                }></Route>
                <Route path="/details" element={
                    <UsergroupDomainDetailsPage
                        cache={ userGroupDetailsCache }
                        setCache={ setUserGroupDetailsCache }
                    />
                }></Route>
            </Routes>
        </div>
    )
}

export default UserGroupManagementDomain;
