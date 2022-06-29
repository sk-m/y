import { Component, createSignal } from "solid-js";
import Button from "../../../components/Button";
import Panel, { PanelDrawer } from "../../../components/Panel";

const EmailPanel: Component = () => {
    const [isPanelDrawerShown, setIsPanelDrawerShown] = createSignal(false);
    const [isNewEmailInputFocused, setIsNewEmailInputFocused] = createSignal(false);

    let panel_ref;

    let new_email_address_input_ref: HTMLInputElement | undefined;

    const showPanelDrawer = () => {
        setIsPanelDrawerShown(true);
        new_email_address_input_ref?.focus();
    }

    const onNewEmailAddressInputKeyUp = (e: KeyboardEvent) => {
        if(e.key === "Escape") {
            setIsPanelDrawerShown(false);
            new_email_address_input_ref?.blur();
        }
    }

    return (
        <Panel
            panel_ref={ ref => { panel_ref = ref } }
            
            drawer_shown={ isPanelDrawerShown() }
            // panel_info_items={[
            //     { icon_name: "verified", text: "Email address verified", color: "green" }
            // ]}
        >
            <div className="h1 ui-status-text">
                <div className="line"></div>
                <div className="header">Email</div>
            </div>

            <div className="ui-status-text green">
                <div className="line"></div>
                {/* <div className="line w-icon">
                    <span class="material-icons-round">done</span>
                </div> */}
                <div className="text">Email address verified</div>
            </div>

            <div className="ui-between center">
                <div className="info">
                    <div className="ui-text w-500">max@google.com</div>
                    <div className="ui-text t-secondary">You can change your email address at any time</div>
                </div>
                <div className="ui-buttons-container">
                    <button
                        classList={{ "ui-button": true, "t-primary": true, disabled: isPanelDrawerShown() }}
                        onclick={ showPanelDrawer }
                    >Change email address</button>
                </div>
            </div>

            <PanelDrawer panel_ref={ panel_ref }>
                <div className="content">
                    <div className="ui-form mb-1">
                        <div className="ui-input-container">
                            <div className="header">New email address</div>
                            <input
                                type="email"
                                placeholder="new@email.com"
                                ref={ new_email_address_input_ref }

                                onkeyup={ onNewEmailAddressInputKeyUp }

                                onFocus={[ setIsNewEmailInputFocused, true ]}
                                onBlur={[ setIsNewEmailInputFocused, false ]}
                                
                                className="ui-input"
                            />
                        </div>
                    </div>
                    <div className="ui-between center">
                        <div className="info">
                            <div className="ui-text">A confirmation email will be sent to the new address. The address will only be changed after you click a confirmation link in that email.</div>
                        </div>
                        <div classList={{ "ui-buttons-container": true, "w-button-hints": isNewEmailInputFocused() }}>
                            <Button text="Submit" hint="submit" />
                            <Button
                                text="Cancel"
                                onclick={[ setIsPanelDrawerShown, false ]}
                            
                                hint="cancel"
                            />
                        </div>
                    </div>
                </div>
            </PanelDrawer>
        </Panel>
    )
}

export default EmailPanel;
