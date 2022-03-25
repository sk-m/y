// TODO @placeholder
const API_URL = "http://beta.local:8083";

export default {
    user_me: async () => {
        return window.fetch(API_URL + "/user/me", {
            method: "GET",
            credentials: "include",
        });
    },

    login: async (username: string, password: string) => {
        return window.fetch(API_URL + "/user/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            credentials: "include",

            body: new URLSearchParams({
                username,
                password
            })
        });
    }
}
