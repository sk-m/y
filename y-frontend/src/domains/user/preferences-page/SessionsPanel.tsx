import { Component, For } from "solid-js";
import Panel from "../../../components/Panel";
import { UserSession } from "../../../interfaces/user";

const SessionsPanel: Component<{
    user_sessions: UserSession[]
}> = props => {
    return (
        <Panel
            classList={{ "user-sessions-panel": true }}

            // panel_info_items={[
            //     { icon_name: "devices", text: "You currently have 3 active sessions" }
            // ]}
        >
            <div className="h1">
                <div className="line"></div>
                <div className="header">Active Sessions</div>
            </div>

            <div className="subheader blue">
                <div className="line"></div>
                {/* <div className="line w-icon">
                    <span class="material-icons">lightbulb</span>
                </div> */}
                <div className="text">You currently have { (props.user_sessions || []).length } active sessions</div>
            </div>

            <p className="ui-text">This is a list of sessions that are currently active on your account. If you see something you don't recognize — immediately destroy the session and change your password.</p>

            <div className="sessions-list">
                <For each={ props.user_sessions }>{(session) => (
                    <div className="session">
                        <div className="left">
                            <div className="client-info">{ session.session_device }</div>
                            {/* <div className="device-info">{ session.session_device }</div> */}
                            <div className="other-info">{ session.session_current_ip } · { session.session_ip_range }</div>
                        </div>
                        <div className="right">
                            <button className="ui-button t-primary tc-red">Destroy</button>
                        </div>
                    </div>
                )}</For>
            </div>
        </Panel>
    )
}

export default SessionsPanel;
