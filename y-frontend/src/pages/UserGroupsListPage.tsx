import { Link, useNavigate } from "solid-app-router";
import { Component } from "solid-js";
import Button from "../components/Button";
import Panel from "../components/Panel";

import "./UserGroupsListPage.css";

const UserGroupsListPage: Component = () => {
    const navigate = useNavigate();

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
                <div className="ui-text t-secondary">Defined groups:</div>

                <Link href="admin" className="list-item">
                    <div className="item-label">Administrator</div>
                    <div className="item-content">
                        <div className="ui-status-text">
                            <div className="line"></div>
                            <div className="text">5 users</div>
                        </div>
                        <div className="ui-status-text red">
                            <div className="line"></div>
                            <div className="text">Dangerous rights</div>
                        </div>
                    </div>
                </Link>

                <div className="ui-spacer"></div>

                <div className="ui-text t-secondary">System groups:</div>

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
