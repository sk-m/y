import { Accessor, Component, createMemo, For, Show } from "solid-js";
import Button from "../../../components/Button";
import Panel from "../../../components/Panel";
import { UserPreferences } from "../../../interfaces/user";
import { plural } from "../../../util";
import { DomainCache } from "../../../util/domain_util";

import API from "../../../api";
import { useCurrentUser } from "../../../stores/current_user";
import { useNavigate } from "solid-app-router";

const SessionsPanel: Component<{
    userPreferences: Accessor<UserPreferences | null | undefined>,
    setCache: (c: DomainCache<UserPreferences>) => void
}> = props => {
    const [_current_user, { logout }] = useCurrentUser();
    const navigate = useNavigate();

    const destroy_session = (session_i: Accessor<number>) => {
        const session = props.userPreferences()?.user_sessions[session_i()];
        if(!session) return;

        props.setCache([null, undefined]);

        session.$ui_setState("loading");

        API.user_destroy_session_by_id(session.session_id)
        .then(() => {
            // Have we just destroyed our own session?
            if(session.session_is_current && logout) {
                void logout();
                navigate("/login");
            } else {
                session.$ui_setState("destroyed");
            }
        })
        .catch((error: Error) => {
            // TODO show error
            alert(`Could not destroy the session. ${ error.message }`);
            session.$ui_setState(undefined);
        })
    }

    const active_sessions_num = createMemo(() => {
        const preferences = props.userPreferences();

        if(!preferences) return 0;
        
        let n = 0;

        for(const session of preferences.user_sessions) {
            if(session.$ui_state() !== "destroyed") n++;
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
            <div className="h1 ui-status-text">
                <div className="line"></div>
                <div className="header">Active Sessions</div>
            </div>

            <div className="ui-status-text blue">
                {/* <div className="line w-icon">
                    <span class="material-icons">lightbulb</span>
                </div> */}
                <div className="line"></div>
                <div className="text">You currently have { active_sessions_num() } active { plural("session", active_sessions_num()) }</div>
            </div>

            <div className="sessions-list">
                <For each={ props.userPreferences()?.user_sessions }>{(session, session_i) => (
                    <div classList={{ session: true, "destroyed": session.$ui_state() === "destroyed" }}>
                        <div className="left">
                            <div className="client-info">{ session.session_device }</div>
                            {/* <div className="device-info">{ session.session_device }</div> */}
                            <div className="other-info">
                                <span title="Last IP address">{ session.session_current_ip }</span> ?? 
                                <span title="Allowed IP range">{ session.session_ip_range }</span>
                                { session.$ui_state() === "destroyed"
                                    ? <>?? <span
                                        className="ui-tc-red"
                                    >destroyed</span></>
                                    : "" }
                                { session.session_is_current
                                    ? <>?? <span
                                        title="This is your current session. Destroying it will log you out"
                                        className="ui-tc-green"
                                    >this session</span></>
                                    : ""
                                }
                            </div>
                        </div>
                        <div className="right">
                            <Show
                                when={ session.$ui_state() !== "destroyed" }
                            >
                                <Button
                                    text={
                                        session.$ui_state() === "loading"
                                        ? "Working..."
                                        : (session.session_is_current ? "Log out" : "Destroy")
                                    }
                                    text_color="red"

                                    disabled={ session.$ui_state() !== undefined }
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
