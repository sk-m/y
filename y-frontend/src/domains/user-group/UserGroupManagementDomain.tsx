import { Component } from "solid-js";
import { Route, Routes, useParams } from "solid-app-router";
import DomainAsideMenu from "../../components_internal/DomainAsideMenu";
import AsideMenuLink from "../../components/AsideMenuLink";

import UsergroupDomainRightsPage from "./RightsPage";
import UsergroupDomainDetailsPage from "./DetailsPage";

const UserGroupManagementDomain: Component = () => {
    const params = useParams();

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
                    <UsergroupDomainDetailsPage />
                }></Route>
            </Routes>
        </div>
    )
}

export default UserGroupManagementDomain;
