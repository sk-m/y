import { CurrentUser } from "../stores/current_user";
import API from ".";

export function user_login(set_current_user: (user: CurrentUser) => void, username: string, password: string) {
    return new Promise((resolve, reject) => {
        API.login(username, password)
        .then(resp => {
            resp.json()
            .then(json => {
                if(json.error) {
                    reject(json.error_message || "Unknown error occured!");
                } else {
                    // Login successfull
                    resolve(true);

                    // The /auth/login route will return some basic info about the user upon successfull log in
                    // We could have just called `_refresh_ensure()` from the CurrentUserProvider, but that would have been wasteful
                    if(set_current_user) set_current_user({
                        user_id: json.user_id,
                        user_username: json.user_username,
                    });
                }
            })
            .catch(() => {
                reject("Internal error occured! Please, try again later.");
            });
        })
        .catch(() => {
            reject("Internal error occured! Please, try again later.");
        });
    });
}
