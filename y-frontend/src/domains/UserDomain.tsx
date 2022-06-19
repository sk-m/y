import { Component, createSignal } from "solid-js";
import { Route, Routes, useParams } from "solid-app-router";
import DomainAsideMenu from "../components_internal/DomainAsideMenu";
import AsideMenuLink from "../components/AsideMenuLink";
import AsideMenuSection from "../components/AsideMenuSection";
import UserDomainPreferencesPage from "./user/PreferencesPage";

import "./UserDomain.css";
import { UserPreferences } from "../interfaces/user";
import { DomainCache } from "../util/domain_util";

const UserDomain: Component = () => {
    const params = useParams();

    const [preferencesCache, setPreferencesCache] = createSignal<DomainCache<UserPreferences>>([null, undefined]);

    return (
        <div id="domain-user" className="ui-domain">
            <DomainAsideMenu
                domain_id="user"

                header="User management"
                subheader="Control over a specific user"

                target_name={ params.user_name }
                target_info={[
                    { key: "Username", value: params.user_name },
                    { key: "Blocked", value: false, inverse_bool: true }
                ]}
            >
                {/* <AsideMenuLink
                    icon_name="face"
                    name="Profile"
                    description="User's profile"

                    to={`/u/${ params.user_name }/profile`}
                /> */}
                <AsideMenuLink
                    icon_name="tune"
                    name="Preferences"
                    description="Manage user's preferences"

                    to={`/u/${ params.user_name }/preferences`}
                />

                <AsideMenuSection name="Admin actions" is_expanded={true} >
                    <AsideMenuLink
                        icon_name="badge"
                        name="Account management"
                        description="Edit user's account information"

                        to={`/u/${ params.user_name }/account`}
                    />
                    <AsideMenuLink
                        icon_name="group"
                        name="Groups"
                        description="Manage user's groups"

                        to={`/u/${ params.user_name }/groups`}
                    />
                    <AsideMenuLink
                        icon_name="block"
                        name="Block"
                        description="Block // unblock user"

                        to={`/u/${ params.user_name }/block`}
                    />
                </AsideMenuSection>
            </DomainAsideMenu>
            
            <Routes>
                <Route path="/preferences" element={
                    <UserDomainPreferencesPage
                        cache={ preferencesCache }
                        setCache={ setPreferencesCache }
                    />
                }></Route>
            </Routes>
        </div>
    )
}

export default UserDomain;
