import { UserRightCategory, UserRightWithOptions } from "./userright";

export interface UserGroup {
    group_id: number;
    
    group_name: string;
    group_display_name: string;

    group_is_system: boolean;
}

export interface UserGroupAssignedRight {
    right_name: string;
    right_is_assigned: boolean;

    right_options: Record<string, unknown>;
}

export type UserGroupWithAssignedRights = UserGroup & {
    assigned_rights: Record<string, UserGroupAssignedRight>;
}

export interface FullUserGroupAPIResponse {
    usergroup: UserGroupWithAssignedRights;

    userright: {
        user_right_categories: Record<string, UserRightCategory>;
        user_rights: Record<string, UserRightWithOptions>;
    };
}
