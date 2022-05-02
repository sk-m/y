import { Accessor } from "solid-js";

export interface BasicUserInfo {
    user_id: number;
    user_username: string;
}

export interface UserPreferences {
    user_sessions: UserSession[];
}

export type UserSessionUIState = "loading" | "destroyed" | undefined;
export interface UserSession {
    session_id: string;

    session_current_ip: string;
    session_ip_range: string;
    session_device: string;

    session_valid_until: number;
    
    session_is_current?: boolean;

    _ui_state: Accessor<UserSessionUIState>;
    _ui_setState: (v: UserSessionUIState) => void
}
