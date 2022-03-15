import type { Component } from "solid-js";
import { Router, Routes, Route } from "solid-app-router";
import MainRoute from "./MainRoute";
import LoginRoute from "./LoginRoute";

const App: Component = () => {
    return (
        <Router>
            <Routes>
                <Route path="/login" component={ LoginRoute } />
                <Route path="/*" component={ MainRoute } />
            </Routes>
        </Router>
    );
};

export default App;
