import type { Component } from "solid-js";
import { Route, Routes } from "solid-app-router";

import "./app.css";

const TestComponent: Component = () => {
    return (
        <div></div>
    );
};

const MainRoute: Component = () => {
    return (
        <div id="mainroute-container">
            <div id="mainroute-horizontal-container">
                <div id="mainroute-aside-container">
                    <div className="aside">
                        <div className="content">
                            <div className="userspace">
                                <div className="main">
                                    <div className="left">
                                        <div className="user">
                                            <div
                                                className="user-avatar"
                                                style={{ "background-image": "url(https://images.unsplash.com/photo-1604076913837-52ab5629fba9?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=687&q=80)" }}
                                            ></div>
                                            <div className="user-username">admin</div>
                                        </div>
                                    </div>
                                    <div className="right">
                                        <div className="notifications-container has-unread">
                                            <div className="notifications-count-container">
                                                <div className="count">43</div>
                                                <div className="icons">
                                                    <span class="material-icons">warning</span>
                                                    <span class="material-icons">question_mark</span>
                                                    <span class="material-icons">north_east</span>
                                                </div>
                                            </div>
                                            <div className="notifications-icon">
                                                <div className="bubble"></div>
                                                <span class="material-icons-round">notifications</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="menu">
                                <div className="links">
                                    <div className="link is-selected needs-attention">
                                        <div className="left">
                                            <div className="selection-indicator"></div>
                                            <div className="icon"><span class="material-icons-round">tune</span></div>
                                            <div className="text-container">
                                                <div className="name">Settings</div>
                                                <div className="description">System settings</div>
                                            </div>
                                        </div>
                                        <div className="right">
                                            <div className="needs-attention-bubble"></div>
                                            <span class="arrow-icon material-icons-round">navigate_next</span>
                                        </div>
                                    </div>
                                    <div className="link">
                                        <div className="left">
                                            <div className="selection-indicator"></div>
                                            <div className="icon"><span class="material-icons-round">tune</span></div>
                                            <div className="text-container">
                                                <div className="name">Settings</div>
                                                <div className="description">System settings</div>
                                            </div>
                                        </div>
                                        <div className="right">
                                            <div className="needs-attention-bubble"></div>
                                            <span class="arrow-icon material-icons-round">navigate_next</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <Routes>
                        <Route path="/" component={ TestComponent } />
                    </Routes>
                </div>
            </div>
        </div>
    );
};

export default MainRoute;
