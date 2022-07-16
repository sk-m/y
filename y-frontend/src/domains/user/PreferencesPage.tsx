import { Component, createMemo, createSignal, Match, Switch } from "solid-js";
import PasswordPanel from "./preferences-page/PasswordPanel";

import API from "../../api";
import PageObstructionScreen from "../../components/PageObstructionScreen";
import { useParams } from "solid-app-router";
import SessionsPanel from "./preferences-page/SessionsPanel";
import { UserPreferences, UserSession, UserSessionUIState } from "../../interfaces/user";
import { CacheableDomainProps, appendUIStateFields, createCachedResource } from "../../util/domain_util";
import { is_resource_ok } from "../../util";

const UserDomainPreferencesPage: Component<CacheableDomainProps<UserPreferences>> = props => {
    const params = useParams();

    const [isErrorRetryable, _setIsErrorRetryable] = createSignal(true);

    const userPreferencesFetcher = async (user_username: string): Promise<UserPreferences> => {
        return API.user_preferences_by_username(user_username)
        .then(data => {
            const user_preferences: UserPreferences = data.user_preferences;
            const user_sessions: UserSession[] = [];
            
            for(const raw_session of user_preferences.user_sessions) {
                user_sessions.push({ 
                    ...raw_session,
                    ...appendUIStateFields<UserSessionUIState , UserPreferences>(undefined, props.setCache)
                });
            }

            user_preferences.user_sessions = user_sessions;

            return user_preferences;
        })
        .catch((error: Error) => {
            // TODO @placeholder We must check what kind of error occurred and decide if we allow retrying
            // We deliberately do not set it back to true at the beginning of this function, this is not a bug!
            // As soon as it gets set to false - it should stay false.
            // setIsErrorRetryable(false);

            return Promise.reject(error.message);
        });
    }

    const [userPreferences, { refetch: refetchUserPreferences }] =
        createCachedResource(params.user_name, userPreferencesFetcher, props.cache, props.setCache);

    const resource_ok = createMemo(() => is_resource_ok(userPreferences));

    return (
        <Switch>
            <Match when={ userPreferences.loading }>
                <PageObstructionScreen type="loading" />
            </Match>

            <Match when={ !resource_ok() }>
                <PageObstructionScreen
                    type="error"

                    error_text={ userPreferences.error as string }
                    on_retry={ isErrorRetryable() ? refetchUserPreferences : undefined }
                />
            </Match>

            <Match when={ resource_ok() }>
                <div id="user-preferences-page" className="ui-domain-page">
                    {/* <Panel
                        classList={{ "user-profile-panel": true }}

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
                                <div className="username">{ params.user_name }</div>
                                <div className="email-address">max@google.com</div>

                                <div className="section-name">
                                    <div className="text">User groups</div>
                                    {/* <div className="authority-bubble authority-high"></div>
                                </div>
                                <div className="user-groups">
                                    <div className="group">Confirmed</div>
                                    <div className="group">Clerk</div>
                                </div>

                                <div className="section-name">
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
                                </div>
                            </div>
                        </div>
                    </Panel> */}

                    <PasswordPanel />

                    {/* <EmailPanel /> */}
                
                    <SessionsPanel
                        userPreferences={ userPreferences }
                    />
                </div>
            </Match>
        </Switch>
    )
}

export default UserDomainPreferencesPage;
