import { Component, createSignal } from "solid-js";
import Panel, { PanelDrawer } from "../../components/Panel";

const UserDomainPreferencesPage: Component = () => {
    // const [isProfilePanelDrawerShown, setIsProfilePanelDrawerShown] = createSignal(false);

    // let panel_ref;

    return (
        <div id="user-preferences-page" className="ui-domain-page">
            <Panel
                // panel_ref={ ref => { panel_ref = ref } }
                classList={{ "user-profile-panel": true }}

                // drawer_shown={ isProfilePanelDrawerShown() }
                // panel_actions={[
                //     {
                //         name: "edit_profile",
                //         text: "Edit profile",
                //         action: () => { return false }
                //     }
                // ]}
            >
                <div className="sides">
                    <div className="left">
                        <div className="avatar-container">
                            <div className="avatar" style={{ "background-image": "url(https://images.unsplash.com/photo-1604076913837-52ab5629fba9?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=687&q=80)" }}></div>
                        </div>
                    </div>
                    <div className="right">
                        <div className="username">max</div>
                        <div className="email-address">max@google.com</div>

                        <div className="section-name">
                            <div className="text">User groups</div>
                            {/* <div className="authority-bubble authority-high"></div> */}
                        </div>
                        <div className="user-groups">
                            <div className="group">Confirmed</div>
                            <div className="group">Clerk</div>
                        </div>

                        {/* <div className="section-name">
                            <div className="text">Bio</div>
                        </div>
                        <div className="bio">
                            1
                            <br /><br />
                            2
                            <br /><br />
                            3
                            <br />
                            4
                        </div> */}
                    </div>
                </div>
                {/* <PanelDrawer panel_ref={ panel_ref }>
                    <div className="content between">
                        <div className="info">
                            <div className="ui-text w-500">You are currently editing your profile.</div>
                            <div className="ui-text t-secondary">Don't forget to save your changes!</div>
                        </div>
                        <div className="drawer-buttons">
                            <button className="ui-button t-primary">Save profile</button>
                            <button className="ui-button t-primary tc-red">Discard</button>
                        </div>
                    </div>
                </PanelDrawer> */}
            </Panel>

            <Panel
                panel_info_items={[
                    { icon_name: "done_all", text: "No action required", color: "green" }
                ]}
            >
                <div className="h1">
                    <div className="line"></div>
                    <div className="header">Password</div>
                </div>

                <div className="ui-between center">
                    <div className="info">
                        <div className="ui-text w-500">Your password was last changed 3 years ago</div>
                        <div className="ui-text t-secondary">You can change your password at any time</div>
                    </div>
                    <div className="ui-buttons-container">
                        <button className="ui-button t-primary">Change password</button>
                    </div>
                </div>
            </Panel>

            <Panel
                panel_info_items={[
                    { icon_name: "verified", text: "Email address verified", color: "green" }
                ]}
            >
                <div className="h1">
                    <div className="line"></div>
                    <div className="header">Email</div>
                </div>

                <div className="ui-between center">
                    <div className="info">
                        <div className="ui-text w-500">max@google.com</div>
                        <div className="ui-text t-secondary">You can change your email address at any time</div>
                    </div>
                    <div className="ui-buttons-container">
                        <button className="ui-button t-primary">Change email address</button>
                    </div>
                </div>
            </Panel>

            <Panel
                classList={{ "user-sessions-panel": true }}

                panel_info_items={[
                    { icon_name: "devices", text: "You currently have 3 active sessions" }
                ]}
            >
                <div className="h1">
                    <div className="line"></div>
                    <div className="header">Active Sessions</div>
                </div>

                <p className="ui-text">This is a list of sessions that are currently active on your account. If you see something you don't recognize — immediately destroy the session and change your password.</p>

                <div className="sessions-list">
                    <div className="session">
                        <div className="left">
                            <div className="client-info">Google Chrome 99.1.1</div>
                            <div className="device-info">Windows 10, 10.0</div>
                            <div className="other-info">Ukraine · 11.22.33.143</div>
                        </div>
                        <div className="right">
                            <button className="ui-button t-primary tc-red">Destroy</button>
                        </div>
                    </div>
                    <div className="session">
                        <div className="left">
                            <div className="client-info">Google Chrome 99.1.1</div>
                            <div className="device-info">Windows 10, 10.0</div>
                            <div className="other-info">Ukraine · 11.22.33.143</div>
                        </div>
                        <div className="right">
                            <button className="ui-button t-primary tc-red">Destroy</button>
                        </div>
                    </div>
                    <div className="session">
                        <div className="left">
                            <div className="client-info">Google Chrome 99.1.1</div>
                            <div className="device-info">Windows 10, 10.0</div>
                            <div className="other-info">Ukraine · 11.22.33.143</div>
                        </div>
                        <div className="right">
                            <button className="ui-button t-primary tc-red">Destroy</button>
                        </div>
                    </div>
                </div>
            </Panel>
        </div>
    )
}

export default UserDomainPreferencesPage;
