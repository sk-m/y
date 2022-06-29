import type { Component } from "solid-js";
import { Route, Routes } from "solid-app-router";

import "./app.css";
import MainAsideMenu from "./components_internal/MainAsideMenu";
import UserDomain from "./domains/user/UserDomain";
import ConfigDomain from "./domains/config/ConfigDomain";

const TestComponent: Component = () => {
    return (
        <div></div>
    );
};

const MainRoute: Component = () => {
    return (
        <div id="mainroute-container">
            <div id="mainroute-horizontal-container">
                <MainAsideMenu />

                <Routes>
                    <Route path="/u/:user_name/*" component={ UserDomain } />
                    <Route path="/config/*" component={ ConfigDomain } />
                    <Route path="/" component={ TestComponent } />
                </Routes>
            </div>
        </div>
    );
};

export default MainRoute;
