import { BasicUserInfo, UserPreferences } from "../interfaces/user";
import { APIResponse, api_fetch } from "../util/api_util";

// TODO use xhr instead
export default {
    user_destroy_session_by_id: async (session_id: string) => (
        api_fetch(`/user/session/${ session_id }`, {
            method: "DELETE",
            credentials: "include",
        })
    ),

    user_preferences_by_username: async (user_username: string) => (
        api_fetch<APIResponse<UserPreferences, "user_preferences">>(`/user/preferences?user_username=${ user_username }`, {
            method: "GET",
            credentials: "include",
        })
    ),

    user_me: async () => (
        api_fetch<APIResponse<BasicUserInfo, "user_me">>("/user/me", {
            method: "GET",
            credentials: "include",
        })
    ),

    logout: async () => (
        api_fetch("/user/logout", {
            method: "POST",
            credentials: "include",
        })
    ),

    login: async (username: string, password: string) => (
        api_fetch<APIResponse<BasicUserInfo, "user_login">>("/user/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            credentials: "include",

            body: new URLSearchParams({
                username,
                password
            })
        })
    ),

    user_create: async (username: string, password: string) => (
        api_fetch<APIResponse<BasicUserInfo, "user_create">>("/user/create", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            credentials: "include",

            body: new URLSearchParams({
                username,
                password
            })
        })
   )
}
