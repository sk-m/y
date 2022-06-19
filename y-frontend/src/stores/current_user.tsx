import { Component, createContext, useContext } from "solid-js";
import { createStore } from "solid-js/store";

import API from "../api";
import { _user_get_current } from "../api/user";

export interface CurrentUser {
    user_id: number;
    user_username: string;

    authoritative: boolean;
}

type CurrentUserStore = [
    {
        /**
         * Holds some basic info about a currenly logged in user. If undefined - the user is not logged in and is anonymous
         */
        user: CurrentUser | undefined
    },
    {
        /**
         * Perform logout.
         * 
         * Returns false if the logout request had an error, true otherwise. User will be logged out in any case, even if a server-side
         * error ocurred. 
         */
        logout?: () => Promise<boolean>,

        /**
         * Call to /user/me and update info about currently logged in user. By doing this, we ensure that the user is really logged in
         * and the information about them is correct
         * 
         * ! You probably will never need to use this function, so make sure you really know what you are doing before calling it.
         */
        _refresh_ensure?: () => void,

        /**
         * Manually set the user info
         * 
         * ! You probably will never need to use this function, so make sure you really know what you are doing before calling it.
         */
        _set_manual?: (user: CurrentUser) => void
    }
];

const CurrentUserContext = createContext<CurrentUserStore>([{ user: undefined }, {}]);

export const UserProvider: Component<{ user: CurrentUser | undefined }> = props => {
    const [state, setState] = 
        // [
        createStore({ user: props.user }),
        store: CurrentUserStore = [
            state,
            {
                logout() {
                    // TODO @move move into a separate function?

                    sessionStorage.removeItem("y_current_user");

                    return API.logout()
                    .then(() => { setState("user", undefined); return true; })
                    .catch(() => { setState("user", undefined); return false; });
                },

                _refresh_ensure() {
                    _user_get_current(user => setState("user", user), /* ensure: */ true)
                    .catch(() => {
                        sessionStorage.removeItem("y_current_user");
                        setState("user", undefined);
                    });
                },

                _set_manual(user) {
                    setState("user", user);
                }
            }
        ];
        // ]
  
    return (
        <CurrentUserContext.Provider value={store}>
            {props.children}
        </CurrentUserContext.Provider>
    );
};

export function useCurrentUser() {
    return useContext(CurrentUserContext);
}
