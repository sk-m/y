import { Accessor, Component, createMemo, For, Show } from "solid-js";
import Button from "../../../components/Button";
import Panel from "../../../components/Panel";
import { UserPreferences } from "../../../interfaces/user";
import { plural } from "../../../util";

import API from "../../../api";

const SessionsPanel: Component<{
    userPreferences: Accessor<UserPreferences | null | undefined>,
}> = props => {
    const destroy_session = (session_i: Accessor<number>) => {
        const session = props.userPreferences()!.user_sessions[session_i()];

        session._ui_setState("loading");
        
        API.user_destroy_session_by_id(session.session_id)
        .then(json => {
            if(json.success) {
                session._ui_setState("destroyed");
            } else {
                // TODO show error
                alert(json.error_message);
                session._ui_setState(undefined);
            }
        })
        .catch(json => {
            // TODO show error
            alert("Could not destroy the session");
            session._ui_setState(undefined);
        })
    }

    const active_sessions_num = createMemo(() => {
        const preferences = props.userPreferences();

        if(!preferences) return 0;
        
        let n = 0;

        for(const session of preferences.user_sessions) {
            if(session._ui_state() !== "destroyed") n++;
        }

        return n;
    });

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
                {/* <div className="line w-icon">
                    <span class="material-icons">lightbulb</span>
                </div> */}
                <div className="line"></div>
                <div className="text">You currently have { active_sessions_num() } active { plural("session", active_sessions_num()) }</div>
            </div>

            <div className="sessions-list">
                <For each={ props.userPreferences()!.user_sessions }>{(session, session_i) => (
                    <div classList={{ session: true, "destroyed": session._ui_state() === "destroyed" }}>
                        <div className="left">
                            <div className="client-info">{ session.session_device }</div>
                            {/* <div className="device-info">{ session.session_device }</div> */}
                            <div className="other-info">
                                <span title="Last IP address">{ session.session_current_ip }</span> · 
                                <span title="Allowed IP range">{ session.session_ip_range }</span>
                                { session._ui_state() === "destroyed" ? " · destroyed" : "" }
                            </div>
                        </div>
                        <div className="right">
                            <Show
                                when={ session._ui_state() !== "destroyed" }
                            >
                                <Button
                                    text={ session._ui_state() === "loading" ? "Working..." : "Destroy" }
                                    text_color="red"

                                    disabled={ session._ui_state() !== undefined }
                                    onclick={[ destroy_session, session_i ]}
                                />
                            </Show>
                        </div>
                    </div>
                )}</For>
            </div>
        </Panel>
    )
}

export default SessionsPanel;
