import { Component, createSignal, For, Match, Show, Switch } from "solid-js";
import Button from "../../../components/Button";
import Checkbox from "../../../components/Checkbox";
import Panel from "../../../components/Panel";

const UserRightItem: Component<{
    name: string;

    display_name: string;
    description: string;

    is_granted?: boolean;
    inherited_from?: "everyone" | "user";

    // TODO @refactor create a common UIPill interface, pills will be used a lot
    info_items?: {
        icon: string;
        text: string;
        
        color?: string;
        title?: string;
    }[]
}> = props => {
    // TODO @placeholder for testing only! Remove
    const [isChecked, setIsChecked] = createSignal(false);

    return (
        <Panel
            classList={{ "user-right-item": true }}

            is_list_item={ true }

            max_width="800px"
        >
            <div className="right-header">
                <div className="left">
                    <Checkbox
                        checked={ isChecked() }
                        checked_hint="Granted"

                        onclick={() => setIsChecked(c => !c)}
                    />
                    <div className="right-display-name">{ props.display_name }</div>
                </div>
                <div className="right">
                    <div className="ui-pills-container">
                        <Show when={ isChecked() }>
                            <div
                                className="ui-pill c-yellow"
                            >
                                <div className="icon"><span class="material-icons-round">edit</span></div>
                                <div className="text">Unsaved</div>
                            </div>
                        </Show>

                        <Switch>
                            <Match when={props.inherited_from === "everyone"}>
                                <div
                                    className="ui-pill c-green ui-w-title"
                                    title="This right is inherited from the 'everyone' group. Everyone implicitly holds this right."
                                >
                                    <div className="icon"><span class="material-icons-round">select_all</span></div>
                                    <div className="text">Inherited from everyone</div>
                                </div>
                            </Match>
                            <Match when={props.inherited_from === "user"}>
                                <div
                                    className="ui-pill c-green ui-w-title"
                                    title="This right is inherited from the 'user' group. Every logged in user implicitly holds this right."
                                >
                                    <div className="icon"><span class="material-icons-round">person</span></div>
                                    <div className="text">Inherited from user</div>
                                </div>
                            </Match>
                        </Switch>

                        <For each={ props.info_items }>
                            {item =>
                                <div
                                    classList={{
                                        "ui-pill": true,
                                        "ui-w-title": !!item.title,
                                        [`c-${item.color ?? "blue"}`]: true
                                    }}
                                    title={ item.title }
                                >
                                    <div className="icon">
                                        <span class="material-icons-round">{ item.icon }</span>
                                    </div>
                                    <div className="text">{ item.text }</div>
                                </div>
                            }
                        </For>
                    </div>
                </div>
            </div>
            
            <div className="right-description">{ props.description }</div>

            <div className="buttons-container">
                <Button text="Options" type="filled" />
            </div>
        </Panel>
    )
}

export default UserRightItem;
