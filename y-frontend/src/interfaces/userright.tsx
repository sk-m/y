export interface UserRightOptionSelectValue {
    value_label: string;

    value: string;
}

export interface UserRightOption {
    option_name: string;
    option_display_name: string;
    option_description: string;

    option_value_type: string;
}

export type UserRightOptionWithValues = UserRightOption & {
    option_select_values: Record<string, UserRightOptionSelectValue>;
}

export interface UserRightCategory {
    category_name: string;
    category_display_name: string;
    category_description: string;
}

export interface UserRight {
    right_name: string;
    right_display_name: string;
    right_description: string;

    right_is_dangerous: false;
    right_category: string;
}

export type UserRightWithOptions = UserRight & {
    right_options: Record<string, UserRightOption>;
}
