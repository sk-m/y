export interface UserPreferences {
    user_sessions: UserSession[];
}

export interface UserSession {
    session_id: string;

    session_current_ip: string;
    session_ip_range: string;
    session_device: string;

    session_valid_until: number;
}
