import { BasicUserInfo, UserPreferences } from "../interfaces/user";
import { FullUserGroupAPIResponse, UserGroup } from "../interfaces/usergroup";
import { UserRightCategory, UserRightWithOptions } from "../interfaces/userright";
import { api_fetch } from "../util/api_util";

// TODO use xhr instead
export default {
    user_destroy_session_by_id: (session_id: string) => (
        api_fetch(`/user/session/${ session_id }`, {
            method: "DELETE",
            credentials: "include",
        })
    ),

    user_preferences_by_username: (user_username: string) => (
        api_fetch<UserPreferences, "user_preferences">(`/user/preferences?user_username=${ user_username }`, {
            method: "GET",
            credentials: "include",
        })
    ),

    user_me: () => (
        api_fetch<BasicUserInfo, "user_me">("/user/me", {
            method: "GET",
            credentials: "include",
        })
    ),

    logout: () => (
        api_fetch<never>("/user/logout", {
            method: "POST",
            credentials: "include",
        })
    ),

    login: (username: string, password: string) => (
        api_fetch<BasicUserInfo, "user_login">("/user/login", {
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

    user_create: (username: string, password: string) => (
        api_fetch<BasicUserInfo, "user_create">("/user/create", {
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

    user_update_password: (current_password: string, new_password: string) => (
        api_fetch("/user/preferences/update_password", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            credentials: "include",

            body: new URLSearchParams({
                current_password,
                new_password
            })
        })
   ),

    usergroup_create: (group_name: string, group_display_name: string) => (
        api_fetch<UserGroup, "usergroup_create">("/usergroup/create", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            credentials: "include",

            body: new URLSearchParams({
                group_name,
                group_display_name
            })
        })
    ),

    usergroup_get_all: () => (
        api_fetch<UserGroup[], "usergroup">("/usergroup", {
            method: "GET",
            credentials: "include",
        })
    ),

    usergroup_get_by_name_full: (group_name: string) => (
        api_fetch<FullUserGroupAPIResponse, "usergroup_get">(`/usergroup/${ group_name }?full=1`, {
            method: "GET",
            credentials: "include",
        })
    ),

    usergroup_update: (group_id: number, group_display_name: string) => (
        api_fetch<UserGroup, "usergroup_update">(`/usergroup/${ group_id }`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            credentials: "include",

            body: new URLSearchParams({
                group_display_name
            })
        })
    ),

    usergroup_delete: (group_id: number) => (
        api_fetch<never, "usergroup_delete">(`/usergroup/${ group_id }`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            credentials: "include",
        })
    ),

    userright_get_all: () => (
        api_fetch<{
            user_right_categories: UserRightCategory[],
            user_rights: UserRightWithOptions[]
        }, "userright">("/userright", {
            method: "GET",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            credentials: "include",
        })
    ),
}
