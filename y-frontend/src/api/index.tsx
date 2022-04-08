import CONFIG from "../../config/config.json";

// TODO @placeholder
// TODO use /api for API routes
const API_URL = CONFIG.api_url;

// TODO use xhr instead
export default {
    user_preferences_by_username: async (user_username: string) => {
        return window.fetch(API_URL + `/user/preferences?user_username=${ user_username }`, {
            method: "GET",
            credentials: "include",
        });
    },

    user_me: async () => {
        return window.fetch(API_URL + "/user/me", {
            method: "GET",
            credentials: "include",
        });
    },

    logout: async () => {
        return window.fetch(API_URL + "/user/logout", {
            method: "POST",
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
    },

    user_create: async (username: string, password: string) => {
        return window.fetch(API_URL + "/user/create", {
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
