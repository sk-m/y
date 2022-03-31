import { Component, createSignal } from "solid-js";
import Button from "../../../components/Button";
import Panel, { PanelDrawer } from "../../../components/Panel";

const PasswordPanel: Component = () => {
    const [isPanelDrawerShown, setIsPanelDrawerShown] = createSignal(false);
    const [isPasswordRepeatInputFocused, setIsPasswordRepeatInputFocused] = createSignal(false);

    let panel_ref;

    let current_password_input_ref: HTMLInputElement | undefined;
    let new_password_input_ref: HTMLInputElement | undefined;
    let password_repeat_input_ref: HTMLInputElement | undefined;

    const showPanelDrawer = () => {
        setIsPanelDrawerShown(true);
        current_password_input_ref?.focus();
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
                    <div className="ui-form mb-1">
                        <div className="ui-input-container">
                            <div className="header">Current password</div>
                            <input
                                type="password"
                                placeholder="*******"
                                ref={ current_password_input_ref }

                                className="ui-input"
                            />
                        </div>
                        <div className="ui-input-container">
                            <div className="header">New password</div>
                            <input
                                type="password"
                                placeholder="**************"
                                ref={ new_password_input_ref }

                                className="ui-input"
                            />
                        </div>
                        <div className="ui-input-container">
                            <div className="header">Repeat new password</div>
                            <input
                                type="password"
                                placeholder="**************"
                                ref={ password_repeat_input_ref }

                                onkeyup={ onPasswordRepeatInputKeyUp }

                                onFocus={[ setIsPasswordRepeatInputFocused, true ]}
                                onBlur={[ setIsPasswordRepeatInputFocused, false ]}

                                className="ui-input"
                            />
                        </div>
                    </div>
                    <div className="ui-between center">
                        <div className="info">
                        </div>
                        <div classList={{ "ui-buttons-container": true, "w-button-hints": isPasswordRepeatInputFocused() }}>
                            <Button text="Confirm" w_hint="submit" />
                            <Button
                                text="Cancel"
                                onclick={[ setIsPanelDrawerShown, false ]}
                            />
                        </div>
                    </div>
                </div>
            </PanelDrawer>
        </Panel>
    )
}

export default PasswordPanel;
