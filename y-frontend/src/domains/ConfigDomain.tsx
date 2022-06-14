import { Route, Routes } from "solid-app-router";
import { Component } from "solid-js";
import AsideMenuLink from "../components/AsideMenuLink";
import DomainAsideMenu from "../components_internal/DomainAsideMenu";
import FeaturesPage from "./config/FeaturesPage";
import InstancePage from "./config/InstancePage";
import UserGroupManagementPage from "./config/UserGroupManagementPage";

import "./ConfigDomain.css";

const ConfigDomain: Component = props => {
    return (
        <div id="domain-config" className="ui-domain">
            <DomainAsideMenu
                domain_id="config"

                header="Config"
                subheader="Instance configuration centre"
            >
                <AsideMenuLink
                    icon_name="domain"
                    name="Instance"
                    description="Name, logo, look & feel, etc."

                    to="/config/instance"
                />
                <AsideMenuLink
                    icon_name="electric_bolt"
                    name="Features"
                    description="Toggle y features"

                    to="/config/features"
                />
                <AsideMenuLink
                    icon_name="login"
                    name="Authentication"
                    description="Who can authenticate and how"

                    to="/config/auth"
                />
                <AsideMenuLink
                    icon_name="security"
                    name="Security"
                    description="Who can access what"

                    to="/config/security"
                />

                <div className="menu-spacer"></div>

                <AsideMenuLink
                    icon_name="groups"
                    name="User groups"
                    description="Manage user groups"

                    to="/config/user-groups/test"
                />
            </DomainAsideMenu>
            
            <Routes>
                <Route path="/instance" element={
                    <InstancePage />
                }></Route>
                <Route path="/features" element={
                    <FeaturesPage />
                }></Route>
                <Route path="/user-groups/:group_name" element={
                    <UserGroupManagementPage />
                }></Route>
            </Routes>
        </div>
    )
}

export default ConfigDomain;
