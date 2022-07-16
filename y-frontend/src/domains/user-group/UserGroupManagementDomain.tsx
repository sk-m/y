import { Component, createMemo, createResource, Match, Switch, on } from "solid-js";
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

export type FormattedUserRights = Record<string, Record<string, UserRightWithOptions> | undefined>;

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

    const formattedUserRights = createMemo(on(resource_ok, (ok) => {
        if(!ok) return;

        const group_info = groupInfo();

        console.debug("Updating formatted rights object", group_info);

        const new_formatted_rights: FormattedUserRights = {};

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        for(const right_name in group_info!.userright.user_rights) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const right = group_info!.userright.user_rights[right_name];

            if(!Object.prototype.hasOwnProperty.call(new_formatted_rights, right.right_category)) {
                new_formatted_rights[right.right_category] = {};
            }

            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            new_formatted_rights[right.right_category]![right.right_name] = right;
        }

        return new_formatted_rights;
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

                <Match when={ resource_ok() && formattedUserRights() }>
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
