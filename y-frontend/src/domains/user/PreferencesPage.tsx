import { Component } from "solid-js";
import Panel from "../../components/Panel";

const UserDomainPreferencesPage: Component = () => {
    return (
        <div id="user-preferences-page" className="ui-domain-page">
            <Panel classList={{ "user-profile-panel": true }}>
                <div className="sides">
                    <div className="left">
                        <div className="avatar-container">
                            <div className="avatar" style={{ "background-image": "url(https://images.unsplash.com/photo-1604076913837-52ab5629fba9?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=687&q=80)" }}></div>
                        </div>
                    </div>
                    <div className="right">
                        <div className="username">max</div>
                        <div className="email-address">max@google.com</div>

                        <div className="section-name">User groups</div>
                        <div className="user-groups">
                            <div className="group">Confirmed</div>
                            <div className="group">Clerk</div>
                        </div>

                        <div className="section-name">Bio</div>
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
            </Panel>
        </div>
    )
}

export default UserDomainPreferencesPage;
