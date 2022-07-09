import { Component, createSignal } from "solid-js";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Panel, { PanelDrawer } from "../../components/Panel";
import { useForm } from "../../util/form";

import "./DetailsPage.css";

const BasicInfoPanel: Component = () => {
    const { link, register_form, submit } = useForm({
        group_name: {
            min_length: 1,
            max_length: 128
        },
        group_display_name: {
            min_length: 1,
            max_length: 128
        },
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
        >
            <div className="h1 ui-status-text" style={{ "margin-bottom": "1.2em" }}>
                <div className="line"></div>
                <div className="header">Basic info</div>
            </div>

            <form {...register_form()}>
                <Input
                    label="Internal group name"

                    {...link("group_name")}
                />

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
                        text: "Save",

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

const UsergroupDomainDetailsPage: Component = () => {
    return (
        <div id="usergroup-details-page" className="ui-domain-page config-items-page">
            <div className="group-details-container config-items-container">
                <div>
                    <BasicInfoPanel />
                    <DeleteGroupPanel />
                </div>
            </div>            
        </div>
    )
} 

export default UsergroupDomainDetailsPage;
