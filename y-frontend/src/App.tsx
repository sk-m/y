import { batch, Component, createSignal, onMount, Show } from "solid-js";
import { Router, Routes, Route } from "solid-app-router";
import MainRoute from "./MainRoute";
import LoginRoute from "./LoginRoute";

import API from "./api";
import { CurrentUser, UserProvider } from "./stores/current_user";

const App: Component = () => {
    const [currentUser, setCurrentUser] = createSignal<CurrentUser | undefined>(undefined);
    const [isReady, setIsReady] = createSignal(false);

    // This gets called if we were not able to get the current user for some reason (server is down, browser does not have a session,
    // there is a session in the browser, but it is invalid, etc.) 
    const current_user_fail = () => setIsReady(true);

    // When we mount our application - get the currently logged in user
    // TODO not sure this is the best approach
    onMount(() => {
        API.user_me()
        .then(resp => {
            resp.json()
            .then(json => {
                if(json.success) {
                    // The server has returned some info about the currently logged in user 
                    batch(() => {
                        setCurrentUser({
                            user_id: json.user_id,
                            user_username: json.user_username
                        });
                        setIsReady(true);
                    });
                } else current_user_fail();
            }).catch(current_user_fail);
        })
        .catch(current_user_fail);
    })

    return (
        <Show when={ isReady() } fallback={ <div>connecting to the server...</div> }>
            <UserProvider user={ currentUser() }>
                <Router>
                    <Routes>
                        <Route path="/login" component={ LoginRoute } />
                        <Route path="/*" component={ MainRoute } />
                    </Routes>
                </Router>
            </UserProvider>
        </Show>
    );
};

export default App;
