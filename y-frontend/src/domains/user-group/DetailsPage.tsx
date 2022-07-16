import { Accessor, Component, createSignal, Match, Switch } from "solid-js";
import Button from "../../components/Button";
import ErrorInfoPanel from "../../components/ErrorInfoPanel";
import Input from "../../components/Input";
import Panel, { PanelDrawer } from "../../components/Panel";
import { FullUserGroupAPIResponse, UserGroup } from "../../interfaces/usergroup";
import { DomainCacheMutator } from "../../util/domain_util";
import { useForm } from "../../util/form";

import "./DetailsPage.css";
import { useNavigate } from "solid-app-router";
import { APIResponse } from "../../util/api_util";

import API from "../../api";

const BasicInfoPanel: Component<{
    group: UserGroup,
    mutateGroupDetails: (data: UserGroup) => void
}> = props => {
    const { link, register_form, submit, status, global_error, error_out } = useForm({
        group_display_name: {
            min_length: 1,
            max_length: 128,

            default_value: props.group.group_display_name
        },
        summary: {
            min_length: 1,
            max_length: 4096,
        },
    }, {
        onSubmit: (values) => {
            if(!props.group.group_id) return error_out("Could not determine the current group");

            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            return API.usergroup_update(props.group.group_id, values.group_display_name!);
        },

        onSuccess: (data: APIResponse<UserGroup, "usergroup_update">) => {
            props.mutateGroupDetails(data.usergroup_update);
        }
    });

    return (
        <Panel
            max_width="800px"
        >
            <div className="h1 ui-status-text" style={{ "margin-bottom": "1.2em" }}>
                <div className="line"></div>
                <div className="header">Basic info</div>
            </div>

            <form {...register_form()}>
                <div className="mb-1">
                    <div className="ui-info-panel c-green" hidden={ status() !== "success" }>Success!</div>
                    <ErrorInfoPanel
                        title="Could not update group information"
                        message={ global_error()?.error_message }
                    />
                </div>

                <Input
                    label="Display group name"

                    {...link("group_display_name")}
                />

                <div className="ui-spacer">
                    <span class="material-icons-round">south</span>
                    <span class="material-icons-round">save</span>
                </div>

                <Input
                    label="Summary // reasoning"
                    placeholder="My boss asked me to..."

                    {...link("summary")}

                    with_button={{
                        text: "Save group",
    
                        onclick: submit
                    }}
                />
            </form>
        </Panel>
    )
}

const DeleteGroupPanel: Component<{
    group: UserGroup
}> = props => {
    let panel_ref;

    const navigate = useNavigate();

    const [drawerShown, setDrawerShown] = createSignal(false);

    const { link, register_form, submit, global_error, error_out } = useForm({
        summary: {
            min_length: 1,
            max_length: 4096,
        },
    }, {
        onSubmit: () => {
            if(!props.group.group_id) return error_out("Could not determine the current group");

            return API.usergroup_delete(props.group.group_id);
        },
        
        onSuccess: () => {
            navigate("/user-groups");
        }
    });

    return (
        <Panel
            max_width="800px"
        
            panel_ref={ ref => { panel_ref = ref } }
            drawer_shown={ drawerShown() }
        >
            <div className="h1 ui-status-text red" style={{ "margin-bottom": "1.2em" }}>
                <div className="line"></div>
                <div className="header">Delete group</div>
            </div>

            <div className="ui-between center">
                <div className="info">
                    <div className="ui-text w-500">Deleting a user group has consequences. Be careful.</div>
                    <div className="ui-text t-secondary">All the users assigned to this group will be automatically removed from it and will no longer hold the rights that it contains.</div>
                </div>
                <div className="ui-buttons-container">
                    <Button
                        text="To group deletion"

                        type="primary"
                        text_color="red"
                    
                        disabled={ drawerShown() }
                        onclick={[setDrawerShown, true]}
                    />
                </div>
            </div>

            <PanelDrawer panel_ref={ panel_ref }>
                <form {...register_form()}>
                    <div className="mb-1">
                        <ErrorInfoPanel
                            title="Could not update group information"
                            message={ global_error()?.error_message }
                        />
                    </div>

                    <Input
                        label="Summary // reasoning for deletion"
                        placeholder="My boss asked me to..."

                        {...link("summary")}

                        with_button={{
                            text: "Delete group",

                            onclick: submit
                        }}
                    />
                </form>
            </PanelDrawer>
        </Panel>
    )
}

const UsergroupDomainDetailsPage: Component<{
    full_usergroup_info: FullUserGroupAPIResponse
    mutateGroupDetails: (data: UserGroup) => void
}> = props => {
    return (
        <div id="usergroup-details-page" className="ui-domain-page config-items-page">
            <div className="group-details-container config-items-container">
                <div>
                    <BasicInfoPanel
                        group={ props.full_usergroup_info.usergroup }
                        mutateGroupDetails={ props.mutateGroupDetails }
                    />

                    <DeleteGroupPanel
                        group={ props.full_usergroup_info.usergroup }
                    />
                </div>
            </div>
        </div>
    )
} 

export default UsergroupDomainDetailsPage;
