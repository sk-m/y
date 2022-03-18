import { Component, createSignal } from "solid-js";
import Panel, { PanelDrawer } from "../../components/Panel";

const UserDomainPreferencesPage: Component = () => {
    const [isProfilePanelDrawerShown, setIsProfilePanelDrawerShown] = createSignal(false);

    let panel_ref;

    return (
        <div id="user-preferences-page" className="ui-domain-page">
            <Panel
                panel_ref={ ref => { panel_ref = ref } }
                classList={{ "user-profile-panel": true }}

                drawer_shown={ isProfilePanelDrawerShown() }
                panel_actions={[
                    {
                        name: "edit_profile",
                        text: "Edit profile",
                        action: () => { setIsProfilePanelDrawerShown(true); return false }
                    }
                ]}
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

                        <div className="section-name">
                            <div className="text">Bio</div>
                            {/* <div className="authority-bubble authority-user"></div> */}
                        </div>
                        <div className="bio">
                            I'm just a guy. Hello!
                            <br /><br />
                            This is a bio, btw.
                            <br /><br />
                            🌌🌌🌌
                            <br />
                            🌕🌕🌕
                        </div>
                    </div>
                </div>
                <PanelDrawer panel_ref={ panel_ref }>
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
                </PanelDrawer>
            </Panel>
        </div>
    )
}

export default UserDomainPreferencesPage;
