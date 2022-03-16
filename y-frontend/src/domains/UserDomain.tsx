import { Component } from "solid-js";
import { Routes } from "solid-app-router";
import DomainAsideMenu from "../components_internal/DomainAsideMenu";
import AsideMenuLink from "../components/AsideMenuLink";
import AsideMenuSection from "../components/AsideMenuSection";

const UserDomain: Component = () => {
    return (
        <div id="domain-user">
            <DomainAsideMenu
                domain_id="user"

                header="User management"
                subheader="Control over a specific user"

                target_info={[
                    { key: "Username", value: "max" },
                    { key: "Blocked", value: false, inverse_bool: true }
                ]}
            >
                <AsideMenuLink
                    icon_name="face"
                    name="Profile"
                    description="User's profile"
                />
                <AsideMenuLink
                    icon_name="tune"
                    name="Preferences"
                    description="Set user's preferences"
                />

                <AsideMenuSection name="Admin actions" is_expanded={true} >
                    <AsideMenuLink
                        icon_name="badge"
                        name="Account management"
                        description="Edit user's account information"
                    />
                    <AsideMenuLink
                        icon_name="group"
                        name="Groups"
                        description="Manage user's groups"
                    />
                    <AsideMenuLink
                        icon_name="block"
                        name="Block"
                        description="Block // unblock user"
                    />
                </AsideMenuSection>
            </DomainAsideMenu>
            
            <Routes>
            </Routes>
        </div>
    )
}

export default UserDomain;
