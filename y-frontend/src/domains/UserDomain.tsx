import { Component } from "solid-js";
import { Routes } from "solid-app-router";
import DomainAsideMenu from "../components_internal/DomainAsideMenu";
import { MenuLink, MenuSection } from "../components_internal/MainAsideMenu";

const UserDomain: Component = () => {
    return (
        <div id="domain-user">
            <DomainAsideMenu
                header="User management"
                subheader="Control over a specific user"

                target_info={[
                    { key: "Username", value: "max" },
                    { key: "Blocked", value: false }
                ]}
            >
                <MenuLink
                    icon_name="face"
                    name="Profile"
                    description="User's profile"
                />
                <MenuLink
                    icon_name="tune"
                    name="Preferences"
                    description="Set user's preferences"
                />

                <MenuSection name="Admin actions" is_expanded={true} >
                    <MenuLink
                        icon_name="badge"
                        name="Account management"
                        description="Edit user's account information"
                    />
                    <MenuLink
                        icon_name="group"
                        name="Groups"
                        description="Manage user's groups"
                    />
                    <MenuLink
                        icon_name="block"
                        name="Block"
                        description="Block // unblock user"
                    />
                </MenuSection>
            </DomainAsideMenu>
            
            <Routes>
            </Routes>
        </div>
    )
}

export default UserDomain;
