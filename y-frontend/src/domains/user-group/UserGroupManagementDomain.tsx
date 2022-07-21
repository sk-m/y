import { Component, createMemo, createResource, Match, Switch, on, Accessor, Setter } from "solid-js";
import { Route, Routes, useParams } from "solid-app-router";
import DomainAsideMenu from "../../components_internal/DomainAsideMenu";
import AsideMenuLink from "../../components/AsideMenuLink";

import UsergroupDomainRightsPage from "./RightsPage";
import UsergroupDomainDetailsPage from "./DetailsPage";
import { FullUserGroupAPIResponse, UserGroup } from "../../interfaces/usergroup";

import API from "../../api";
import PageObstructionScreen from "../../components/PageObstructionScreen";
import { UserRightWithOptions } from "../../interfaces/userright";
import { is_resource_ok } from "../../util";
import { appendUIStateFields } from "../../util/domain_util";

type CategoryName = string;
type RightName = string;
type OptionName = string;

export interface FormattedUserRightsRightUIState {
    is_assigned: boolean;
    options: Record<string, unknown>;
}

interface FormattedUserRightsRight {
    user_right: UserRightWithOptions;

    $ui_state: Accessor<FormattedUserRightsRightUIState>;
    $ui_setState: Setter<FormattedUserRightsRightUIState>
}

export type FormattedUserRights = Record<CategoryName, Record<RightName, FormattedUserRightsRight> | undefined>;

const UserGroupManagementDomain: Component = () => {
    const params = useParams();

    const groupInfoFetcher = async (group_name: string): Promise<FullUserGroupAPIResponse> => {
        return API.usergroup_get_by_name_full(group_name)
        .then(data => {
            return data.usergroup_get;
        })
        .catch((error: Error) => {
            return Promise.reject(error.message);
        });
    }

    const [groupInfo, { refetch: refetchGroupInfo, mutate: mutateGroupInfo }] =
        createResource(params.group_name, groupInfoFetcher);

    const mutateGroupDetails = (data: UserGroup) => {
        const current_group_info = groupInfo();

        if(!current_group_info) return;

        current_group_info.usergroup = {
            ...current_group_info.usergroup,
            ...data
        };

        mutateGroupInfo(current_group_info);
    }

    const resource_ok = createMemo(() => is_resource_ok(groupInfo));

    // TODO @bug? check if we rerun on refetch
    const formattedUserRights = createMemo(on(resource_ok, (ok) => {
        if(!ok) return;

        const group_info = groupInfo();

        console.debug("Updating formatted rights object...");

        const new_formatted_rights: FormattedUserRights = {};

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const rights = Object.values(group_info!.userright.user_rights);
        const rights_num = rights.length;

        for(let i = 0; i < rights_num; i++) {
            const right = rights[i];

            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const assigned_right_options = group_info!.usergroup.assigned_rights[right.right_name];

            if(!Object.prototype.hasOwnProperty.call(new_formatted_rights, right.right_category)) {
                new_formatted_rights[right.right_category] = {};
            }

            const formatted_right_record: FormattedUserRightsRight = {
                user_right: right,

                ...appendUIStateFields<FormattedUserRightsRightUIState>({
                    is_assigned: !!assigned_right_options,
                    options: assigned_right_options ?? {}
                })
            }

            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            new_formatted_rights[right.right_category]![right.right_name] = formatted_right_record;
        }

        return new_formatted_rights;
    }));

    // TODO @bug? check if we rerun on refetch
    const initialUserRights = createMemo(on(resource_ok, (ok) => {
        if(!ok) return;

        const group_info = groupInfo();

        console.debug("Updating initial rights object...");

        const new_initial_rights: Record<RightName, Record<OptionName, unknown> | undefined> = {};

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        for(const right_name in group_info!.usergroup.assigned_rights) {
            if(!right_name) return;

            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const assigned_right = group_info!.usergroup.assigned_rights[right_name];

            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            new_initial_rights[right_name] = assigned_right;
        }

        return new_initial_rights;
    }));

    return (
        <div id="domain-usergroup" className="ui-domain">
            <Switch>
                <Match when={ groupInfo.loading }>
                    <PageObstructionScreen type="loading" />
                </Match>

                <Match when={ !resource_ok() }>
                    <PageObstructionScreen
                        type="error"

                        error_text={ groupInfo.error as string }
                        on_retry={ refetchGroupInfo }
                    />
                </Match>

                <Match when={ resource_ok() && formattedUserRights() && initialUserRights() }>
                    <DomainAsideMenu
                        domain_id="usergroup"

                        header="User group"
                        subheader="User group management"

                        target_name={ params.group_name }
                    
                        back_link={{
                            text: "All groups",
                            href: "/user-groups"
                        }}
                    >
                        <AsideMenuLink
                            icon_name="checklist"
                            name="Group rights"
                            description="Assigned rights"

                            to={`/user-groups/${ params.group_name }/rights`}
                        />
                        <AsideMenuLink
                            icon_name="settings"
                            name="Details"
                            description="Edit the group details"

                            to={`/user-groups/${ params.group_name }/details`}
                        />

                        <div className="menu-spacer"></div>

                        <AsideMenuLink
                            icon_name="supervisor_account"
                            name="Users list"
                            description="List of users in this group"

                            to={`/user-groups/${ params.group_name }/users`}
                        />
                    </DomainAsideMenu>
                    
                    <Routes>
                        <Route path="/rights" element={
                            <UsergroupDomainRightsPage
                                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                                full_usergroup_info={ groupInfo()! }
                                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                                formatted_user_rights={ formattedUserRights()! }
                                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                                initial_user_rights={ initialUserRights()! }
                            />
                        }></Route>
                        <Route path="/details" element={
                            <UsergroupDomainDetailsPage
                                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                                full_usergroup_info={ groupInfo()! }
                                mutateGroupDetails={ mutateGroupDetails }
                            />
                        }></Route>
                    </Routes>
                </Match>
            </Switch>
        </div>
    )
}

export default UserGroupManagementDomain;
