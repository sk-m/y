import { UserRightCategory, UserRightWithOptions } from "./userright";

export interface UserGroup {
    group_id: number;
    
    group_name: string;
    group_display_name: string;

    group_is_system: boolean;
}

export type UserGroupWithAssignedRights = UserGroup & {
    assigned_rights: Record<string, Record<string, unknown> | undefined>;
}

export interface FullUserGroupAPIResponse {
    usergroup: UserGroupWithAssignedRights;

    userright: {
        user_right_categories: Record<string, UserRightCategory>;
        user_rights: Record<string, UserRightWithOptions>;
    };
}
