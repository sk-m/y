import { Link, useNavigate } from "solid-app-router";
import { Component, createResource, createSignal, For } from "solid-js";
import Button from "../components/Button";
import Panel from "../components/Panel";
import API from "../api";

import "./UserGroupsListPage.css";
import { APIResponse } from "../util/api_util";
import { UserGroup } from "../interfaces/usergroup";
import ErrorInfoPanel from "../components/ErrorInfoPanel";

const UserGroupsListPage: Component = () => {
    const navigate = useNavigate();

    const fetch_all_groups = () => {
        return API.usergroup_get_all()
        .then((data: APIResponse<UserGroup[], "usergroup">) => {
            return data.usergroup;
        })
        .catch((error: Error) => {
            // TODO @placeholder it would be better to return more info about the error, not just the message. Also, the Error
            // object does not fit well here
            setError(error.message);
            
            return [];
        })
    };

    const [allUserGroups] = createResource("1", fetch_all_groups);
    const [error, setError] = createSignal<string | undefined>();

    return (
        <div className="ui-domain-page" id="usergroups-list-page">
            <div className="ui-domain-page-header" style={{ "max-width": "800px" }}>
                <span className="title ui-text-w-icon-l gray-icon">
                    <span class="material-icons-round">groups</span>
                    User Groups
                </span>
                <div className="description">List of user groups that exist on this instance.</div>
            </div>

            <Panel
                max_width="800px"

                no_spacer={ true }
            >
                <div className="ui-between center">
                    <div className="ui-text w-500">Want to create a new group?</div>
                    <div>
                        <Button
                            text="To group creation"

                            onclick={[ navigate, "/create-user-group" ]}
                        />
                    </div>
                </div>
            </Panel>

            <div className="ui-spacer m-smaller"></div>

            <div className="ui-blocks-list usergroups-list">
                <div className="ui-text t-secondary mb-1">Defined groups:</div>

                <ErrorInfoPanel title="Could not load groups" message={ error() } />        

                <For each={ allUserGroups() ?? [] }>
                    { usergroup => (
                        <Link href={ usergroup.group_name } className="list-item">
                            <div className="item-label">{ usergroup.group_display_name }</div>
                            <div className="item-content">
                                <div className="ui-text t-secondary">{ usergroup.group_name }</div>
                            </div>
                        </Link>
                    ) }
                </For>

                <div className="ui-spacer m-smaller"></div>

                <div className="ui-text t-secondary mb-1">System groups:</div>

                <Link href="everyone" className="list-item">
                    <div className="item-label">Everyone</div>
                    <div className="item-content">
                        <div className="ui-status-text">
                            <div className="line"></div>
                            <div className="text">Implicitly assigned to <i>any</i> client, logged in or not</div>
                        </div>
                    </div>
                </Link>

                <Link href="user" className="list-item">
                    <div className="item-label">User</div>
                    <div className="item-content">
                        <div className="ui-status-text">
                            <div className="line"></div>
                            <div className="text">Implicitly assigned to all logged in users</div>
                        </div>
                    </div>
                </Link>
            </div>
        </div>
    )
}

export default UserGroupsListPage;
