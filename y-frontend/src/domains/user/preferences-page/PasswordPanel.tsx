import { Component, createSignal } from "solid-js";
import Button from "../../../components/Button";
import Panel, { PanelDrawer } from "../../../components/Panel";
import API from "../../../api";
import { useForm } from "../../../util/form";
import Input from "../../../components/Input";
import ErrorInfoPanel from "../../../components/ErrorInfoPanel";

const PasswordPanel: Component = () => {
    const [isPanelDrawerShown, setIsPanelDrawerShown] = createSignal(false);

    let panel_ref;

    const { fields, status, global_error, link, register_form, submit, error_out } = useForm({
        current_password: {},
        new_password: {
            min_length: 8,
            max_length: 2048
        },
        new_password_repeat: {
            min_length: 8,
            max_length: 2048,
        },
    }, {
        onSubmit: (values) => {
            if(values.new_password !== values.new_password_repeat) {
                error_out("Your new password and it's repeat do not match.");
                return;
            }

            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            return API.user_update_password(values.current_password!, values.new_password!);
        },

        onCancel: () => setIsPanelDrawerShown(false)
    });

    const showPanelDrawer = () => {
        setIsPanelDrawerShown(true);

        fields.current_password.ref?.focus();
    }

    return (
        <Panel
            panel_ref={ ref => { panel_ref = ref } }

            drawer_shown={ isPanelDrawerShown() }
            // panel_info_items={[
            //     { icon_name: "done_all", text: "No action required", color: "green" }
            // ]}
        >
            <div className="h1 ui-status-text">
                <div className="line"></div>
                <div className="header">Password</div>
            </div>
            
            <div className="ui-status-text green">
                <div className="line"></div>
                {/* <div className="line w-icon">
                    <span class="material-icons-round">done_all</span>
                </div> */}
                <div className="text">No action required</div>
            </div>

            <div className="ui-between center">
                <div className="info">
                    <div className="ui-text w-500">Your password was last changed 3 years ago</div>
                    <div className="ui-text t-secondary">You can change your password at any time</div>
                </div>
                <div className="ui-buttons-container">
                    <Button
                        text="Change password"
                        type="primary"
                    
                        disabled={ isPanelDrawerShown() }
                        onclick={ showPanelDrawer }
                    />
                </div>
            </div>

            <PanelDrawer panel_ref={ panel_ref }>
                <div className="content">
                    <form {...register_form()}>
                        <div className="mb-1">
                            <div className="ui-info-panel c-green" hidden={ status() !== "success" }>Success!</div>
                            <ErrorInfoPanel
                                message={ global_error()?.error_message }
                            />
                        </div>

                        {/* Accessibility */}
                        <input
                            hidden
                            type="text"

                            name="username"
                            autocomplete="username"
                        />

                        <Input
                            label="Current password"

                            type="password"
                            placeholder="*******"
                            autocomplete="current-password"

                            { ...link("current_password") }
                        />

                        <Input
                            label="New password"

                            type="password"
                            placeholder="**************"
                            autocomplete="new-password"

                            { ...link("new_password") }
                        />
                        
                        <Input
                            label="Repeat new password"

                            type="password"
                            placeholder="**************"
                            autocomplete="new-password"

                            { ...link("new_password_repeat", { submittable_field: true }) }
                        />

                        <div className="ui-between center mt-15">
                            <div className="info"></div>
                            <div className="ui-buttons-container">
                                <Button
                                    text="Cancel"
                                    hint="cancel"

                                    onclick={[ setIsPanelDrawerShown, false ]}
                                />
                                <Button
                                    text="Confirm"
                                    hint="submit"

                                    onclick={submit}
                                />
                            </div>
                        </div>
                    </form>
                </div>
            </PanelDrawer>
        </Panel>
    )
}

export default PasswordPanel;
