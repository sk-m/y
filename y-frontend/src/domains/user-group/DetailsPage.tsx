import { Accessor, Component, createSignal, Match, Switch } from "solid-js";
import Button from "../../components/Button";
import ErrorInfoPanel from "../../components/ErrorInfoPanel";
import Input from "../../components/Input";
import Panel, { PanelDrawer } from "../../components/Panel";
import { UserGroup } from "../../interfaces/usergroup";
import { CacheableDomainProps } from "../../util/domain_util";
import { useForm } from "../../util/form";
import { createCachedResource } from "../../util/domain_util";

import API from "../../api";

import "./DetailsPage.css";
import { useParams } from "solid-app-router";
import PageObstructionScreen from "../../components/PageObstructionScreen";

const BasicInfoPanel: Component<{
    group: Accessor<UserGroup>
}> = props => {
    const { link, register_form, submit, status, global_error, error_out } = useForm({
        group_display_name: {
            min_length: 1,
            max_length: 128,

            default_value: props.group().group_display_name
        },
        summary: {
            min_length: 1,
            max_length: 4096,
        },
    }, {
        onSubmit: (values) => {
            const target_group = props.group();

            if(!target_group.group_id) return error_out("Could not determine the current group");

            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            return API.usergroup_update(target_group.group_id, values.group_display_name!);
        },
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

const DeleteGroupPanel: Component = () => {
    let panel_ref;

    const [drawerShown, setDrawerShown] = createSignal(false);

    const { link, register_form, submit } = useForm({
        summary: {
            min_length: 1,
            max_length: 4096,
        },
    }, {
        onSubmit: () => {
            return;
        },
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

const UsergroupDomainDetailsPage: Component<CacheableDomainProps<UserGroup>> = props => {
    const params = useParams();

    const groupDetailsFetcher = async (group_name: string): Promise<UserGroup> => {
        return API.usergroup_get_by_name(group_name)
        .then(data => {
            return data.usergroup_get;
        })
        .catch((error: Error) => {
            return Promise.reject(error.message);
        });
    }

    const [groupDetails, { refetch: refetchGroupDetails, mutate: mutateGroupDetails }] =
        createCachedResource(params.group_name, groupDetailsFetcher, props.cache, props.setCache);

    return (
        <Switch>
            <Match when={ groupDetails.loading }>
                <PageObstructionScreen type="loading" />
            </Match>

            <Match when={ !!groupDetails.error || groupDetails() === undefined }>
                <PageObstructionScreen
                    type="error"

                    error_text={ groupDetails.error as string }
                    on_retry={ refetchGroupDetails }
                />
            </Match>

            <Match when={ groupDetails() }>
                <div id="usergroup-details-page" className="ui-domain-page config-items-page">
                    <div className="group-details-container config-items-container">
                        <div>
                            <BasicInfoPanel
                                group={ groupDetails as Accessor<UserGroup> }
                            />
                            <DeleteGroupPanel />
                        </div>
                    </div>
                </div>
            </Match>
        </Switch>
    )
} 

export default UsergroupDomainDetailsPage;
