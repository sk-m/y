import { Component, createSignal, onMount, Show } from "solid-js";
import { Router, Routes, Route } from "solid-app-router";
import MainRoute from "./MainRoute";
import LoginRoute from "./LoginRoute";

import { CurrentUser, UserProvider } from "./stores/current_user";
import { _user_get_current } from "./api/user";

const App: Component = () => {
    const [currentUser, setCurrentUser] = createSignal<CurrentUser | undefined>(undefined);
    const [isReady, setIsReady] = createSignal(false);

    // When we mount our application - get the currently logged in user
    // TODO not sure this is the best approach
    onMount(() => {
        _user_get_current(setCurrentUser)
        .then(() => setIsReady(true))
        .catch(() => setIsReady(true));
    })

    return (
        <Show when={ isReady() } fallback={ <div>connecting to the server...</div> }>
            <UserProvider user={ currentUser() }>
                <Router>
                    <Routes>
                        <Route path="/login" element={ <LoginRoute action="login" /> } />
                        <Route path="/join" element={ <LoginRoute action="join" /> } />
                        
                        <Route path="/*" component={ MainRoute } />
                    </Routes>
                </Router>
            </UserProvider>
        </Show>
    );
};

export default App;
