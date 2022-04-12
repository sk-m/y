import { Accessor, Component, createResource, createSignal, Match, ResourceFetcherInfo, Switch } from "solid-js";
import Panel from "../../components/Panel";
import EmailPanel from "./preferences-page/EmailPanel";
import PasswordPanel from "./preferences-page/PasswordPanel";

import API from "../../api";
import PageObstructionScreen from "../../components/PageObstructionScreen";
import { useParams } from "solid-app-router";
import SessionsPanel from "./preferences-page/SessionsPanel";
import { UserPreferences } from "../../interfaces/user";
import { cachedFetcher, CacheableDomainProps } from "../../util/domain_util";

const UserDomainPreferencesPage: Component<CacheableDomainProps<UserPreferences>> = props => {
    const params = useParams();

    const [isErrorRetryable, setIsErrorRetryable] = createSignal(true);

    const userPreferencesFetcher = async (user_username: string): Promise<UserPreferences> => {
        return new Promise((resolve, reject) => {
            API.user_preferences_by_username(user_username)
            .then(json => {
                if(json.success) {
                    resolve(json.user_preferences);
                } else {
                    // We deliberately do not set it back to true at the beginning of this function, this is not a bug!
                    // As soon as it gets set to false - it should stay false.
                    setIsErrorRetryable(false);

                    reject(json.error_message || "Some error occured. Please, try again in a moment.");
                }
            })
            .catch(() => {
                reject("Some error occured. Please, try again in a moment.");
            })
        });
    }

    // const [userPreferences, { refetch: refetchUserPreferences }] = createResource(params.user_name, userPreferencesFetcher);
    const [userPreferences, { refetch: refetchUserPreferences }] =
        createResource(params.user_name, cachedFetcher(props.cache, props.setCache, userPreferencesFetcher));

    return (
        <Switch>
            <Match when={ userPreferences.loading }>
                <PageObstructionScreen type="loading" />
            </Match>

            <Match when={ userPreferences.error || userPreferences() === undefined }>
                <PageObstructionScreen
                    type="error"

                    error_text={ userPreferences.error }
                    on_retry={ isErrorRetryable () ? refetchUserPreferences : undefined }
                />
            </Match>

            <Match when={ userPreferences() }>
                <div id="user-preferences-page" className="ui-domain-page">
                    <Panel
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
                    </Panel>

                    <PasswordPanel />

                    <EmailPanel />
                
                    <SessionsPanel
                        user_sessions={ userPreferences()!.user_sessions || [] }
                    />
                </div>
            </Match>
        </Switch>
    )
}

export default UserDomainPreferencesPage;
