import { Component, createContext, useContext } from "solid-js";
import { createStore } from "solid-js/store";

import API from "../api";

export interface CurrentUser {
    user_id: number;
    user_username: string;
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
         * Call to /user/me and update info about currently logged in user. By doing this, we ensure that the user is really logged in
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
                // TODO @cleanup @refactor DRY we use the same code in the `App.tsx`
                _refresh_ensure() {
                    API.user_me()
                    .then(resp => {
                        resp.json()
                        .then(json => {
                            if(json.success) {
                                // The server has returned some info about the currently logged in user 
                                setState("user", {
                                    user_id: json.user_id,
                                    user_username: json.user_username
                                });
                            } else setState("user", undefined);
                        }).catch(() => setState("user", undefined));
                    }).catch(() => setState("user", undefined));
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
