import { Component, createSignal } from "solid-js";
import Button from "../../../components/Button";
import Panel, { PanelDrawer } from "../../../components/Panel";
import API from "../../../api";
import { useForm } from "../../../util/form";
import FormFieldError from "../../../components/FormFieldError";

const PasswordPanel: Component = () => {
    const [isPanelDrawerShown, setIsPanelDrawerShown] = createSignal(false);
    const [isPasswordRepeatInputFocused, setIsPasswordRepeatInputFocused] = createSignal(false);

    let panel_ref;

    const { fields, status, global_error, link, submit, error_out } = useForm({
        current_password: {
            max_length: 2028
        },
        new_password: {
            min_length: 8,
            max_length: 2048
        },
        new_password_repeat: {
            min_length: 8,
            max_length: 2048,
        },
    }, {
        onSubmit: (values, _action_name, _e) => {
            if(values.new_password !== values.new_password_repeat) {
                error_out("Your new password and it's repeat do not match.");
                return;
            }

            return API.user_update_password(values.current_password!, values.new_password!);
        },
    });

    const showPanelDrawer = () => {
        setIsPanelDrawerShown(true);

        fields.current_password?.ref?.focus();
    }

    const onPasswordRepeatInputKeyUp = (e: KeyboardEvent) => {
        // TODO @placeholder @incomplete on ctrl+return
    }

    return (
        <Panel
            panel_ref={ ref => { panel_ref = ref } }

            drawer_shown={ isPanelDrawerShown() }
            // panel_info_items={[
            //     { icon_name: "done_all", text: "No action required", color: "green" }
            // ]}
        >
            <div className="h1">
                <div className="line"></div>
                <div className="header">Password</div>
            </div>
            
            <div className="subheader green">
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
                    <form className="ui-form mb-1">
                        <div className="ui-info-panel c-green mb-1" hidden={ status() !== "success" }>Success!</div>
                        <div className="ui-info-panel c-red mb-1" hidden={ !global_error() }>{ global_error() }</div>

                        {/* Accessibility */}
                        <input
                            hidden
                            type="text"

                            name="username"
                            autocomplete="username"
                        />

                        <div className="ui-input-container">
                            <div className="header">Current password</div>
                            <input
                                type="password"
                                placeholder="*******"

                                className="ui-input"

                                autocomplete="current-password"

                                { ...link("current_password") }
                            />
                            <FormFieldError error={ fields.current_password.error } />
                        </div>
                        <div className="ui-input-container">
                            <div className="header">New password</div>
                            <input
                                type="password"
                                placeholder="**************"

                                className="ui-input"

                                autocomplete="new-password"

                                { ...link("new_password") }
                            />
                            <FormFieldError error={ fields.new_password.error } />
                        </div>
                        <div className="ui-input-container">
                            <div className="header">Repeat new password</div>
                            <input
                                type="password"
                                placeholder="**************"

                                onkeyup={ onPasswordRepeatInputKeyUp }

                                onFocus={[ setIsPasswordRepeatInputFocused, true ]}
                                onBlur={[ setIsPasswordRepeatInputFocused, false ]}

                                className="ui-input"

                                autocomplete="new-password"

                                { ...link("new_password_repeat") }
                            />
                            <FormFieldError error={ fields.new_password_repeat.error } />
                        </div>
                    </form>
                    <div className="ui-between center">
                        <div className="info">
                        </div>
                        <div classList={{ "ui-buttons-container": true, "w-button-hints": isPasswordRepeatInputFocused() }}>
                            <Button
                                text="Cancel"
                                onclick={[ setIsPanelDrawerShown, false ]}
                            />
                            <Button
                                text="Confirm"
                                w_hint="submit"

                                onclick={submit}
                            />
                        </div>
                    </div>
                </div>
            </PanelDrawer>
        </Panel>
    )
}

export default PasswordPanel;
