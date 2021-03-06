import { CurrentUser } from "../stores/current_user";
import API from ".";

interface SessionStorageInfo extends Omit<CurrentUser, "authoritative"> {
    valid_until: number;
}

function save_user_to_session_storage(user: Omit<CurrentUser, "authoritative">) {
    const session_storage_info: SessionStorageInfo = {
        // For how long we will "trust" this information. If we get this info and the valid_until timestamp is < than
        // the current timestamp - call /user/me and update this info 
        valid_until: new Date().getTime() + 3600000, // One hour for now
        ...user
    };

    // Save the user details in the browser's sessionStorage
    // This is done to minimize the amount of /user/me calls
    // TODO @doc better explanation needed. This is for hydration
    window.sessionStorage.setItem("y_current_user", JSON.stringify(session_storage_info));

    console.debug("[y] [🔑 auth] Saved user info to the sessionStorage");
}

// TODO @doc
/**
 * !!! Please use _refresh_ensure() from useCurrentUser() instead of this if you need to ensure that the user is actually logged in.
 * !!! This function is internal
 */
export function _user_get_current(set_current_user: (user: CurrentUser) => void, ensure = false) {
    return new Promise((resolve: (status: true) => void, reject: () => void) => {
        // Before making a request to /user/me, check if we already have this information in our browser, we might not need to make
        // any API calls
        const session_storage_user_raw = ensure ? null : window.sessionStorage.getItem("y_current_user");
        let current_user: CurrentUser | undefined = undefined;

        if(session_storage_user_raw) {
            try {
                const session_storage_user = JSON.parse(session_storage_user_raw) as SessionStorageInfo;

                if(session_storage_user.valid_until > new Date().getTime()) {
                    // The browser holds a non-expired info about a currently logged in user, no API calls required
                    current_user = {
                        user_id: session_storage_user.user_id,
                        user_username: session_storage_user.user_username,

                        authoritative: false
                    };
                }
            } catch(e) {
                // TODO @log if we get here - we probably have a bug!
                current_user = undefined;
            }
        }

        if(current_user) {
            console.debug("[y] [🔑 auth] Got the user info from the sessionStorage");

            set_current_user(current_user);
            resolve(true);
        }
        else {
            API.user_me()
            .then(data => {
                // The server has returned some info about the currently logged in user 
                resolve(true);

                console.debug("[y] [🔑 auth] Got the user info from the API call");

                const basic_user_info = {
                    user_id: data.user_me.user_id,
                    user_username: data.user_me.user_username,
                };

                set_current_user({
                    ...basic_user_info,

                    authoritative: true
                });

                save_user_to_session_storage(basic_user_info);
            })
            .catch(() => reject()); // Make sure we reject with 0 parameters
        }
    });
}

/**
 * !!! This function is semi-internal, meaning that while you can absolutely use it if you want, I really doubt you
 * !!! will actually need to. There is only one login page in the engine and it should remain that way
 * 
 * Try to perform login with provided credentials. This will handle updating the CurrentUser store, y_current_user sessionStorage value,
 * etc.
 * 
 * @param set_current_user _set_manual() from useCurrentUser()
 * @param username user's username
 * @param password user's cleartext password
 */
export function _user_login(set_current_user: (user: CurrentUser) => void, username: string, password: string) {
    return new Promise((resolve: (status: boolean) => void, reject: (message: string) => void) => {
        API.login(username, password)
        .then(data => {
            resolve(true);

            // The /user/login route will return some basic info about the user upon successfull log in
            // We could have just called `_refresh_ensure()` from the CurrentUserProvider, but that would have been wasteful
            const basic_user_info = {
                user_id: data.user_login.user_id,
                user_username: data.user_login.user_username,
            };

            set_current_user({
                ...basic_user_info,
                authoritative: true
            });

            save_user_to_session_storage(basic_user_info);
        })
        .catch((error: Error) => {
            reject(error.message);
        });
    });
}

export function _user_create(set_current_user: (user: CurrentUser) => void, username: string, password: string) {
    return new Promise((resolve: (status: boolean) => void, reject: (message: string) => void) => {
        API.user_create(username, password)
        .then(data => {
            resolve(true);

            // The /user/create route will return some basic info about the user upon successfull registration
            // We could have just called `_refresh_ensure()` from the CurrentUserProvider, but that would have been wasteful
            const basic_user_info = {
                user_id: data.user_create.user_id,
                user_username: data.user_create.user_username,
            };

            set_current_user({
                ...basic_user_info,
                authoritative: true
            });

            save_user_to_session_storage(basic_user_info);
        })
        .catch((error: Error) => {
            reject(error.message);
        });
    });
}
