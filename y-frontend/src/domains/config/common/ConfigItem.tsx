import { Component, createSignal, For } from "solid-js";
import Button from "../../../components/Button";
import Input from "../../../components/Input";
import Panel, { PanelDrawer } from "../../../components/Panel";
import { useForm } from "../../../util/form";

type AccessInfoItemTypes = "custom" | "readable" | "writeable" | "sensitive" | "dangerous";

const ACCESS_INFO_ITEMS: {[type: string]: any} = {
    "readable": {
        icon: "visibility",
        color: "green",
        text: "You can view"
    },
    "writeable": {
        icon: "edit",
        color: "green",
        text: "You can edit"
    },
    "sensitive": {
        icon: "password",
        color: "red",
        text: "Sensitive info"
    },
    "dangerous": {
        icon: "priority_high",
        color: "red",
        text: "Dangerous"
    },
}

interface AccessInfoItem {
    type: AccessInfoItemTypes;
    title: string;

    /** Only used when type == "custom" */
    icon?: string;
    /** Only used when type == "custom" */
    color?: string;
    /** Only used when type == "custom" */
    text?: string;
}

const ConfigItem: Component<{
    name: string;
    title: string;
    description: string;

    value_type: "string";
    value: string;

    access_info_items: AccessInfoItem[];
}> = props => {
    let panel_ref;

    const [drawerShown, setDrawerShown] = createSignal(false);
    const toggleDrawerShown = () => setDrawerShown(s => !s);

    const { link, register_form, submit } = useForm({
        value: {
            default_value: props.value,
            optional: true
        },
        summary: {
            min_length: 1,
            max_length: 4096,
        },
    }, {
        onSubmit: (_values, _action_name, _e) => {
            return;
        },
    });

    return (
        <Panel
            panel_ref={ ref => { panel_ref = ref } }
            drawer_shown={ drawerShown() }

            classList={{ "config-item": true }}
            is_list_item={ true }

            max_width="900px"
        >
            <div className="panel-sides" onclick={ toggleDrawerShown }>
                <div className="left">
                    <div className="config-title">{ props.title }</div>
                    {/* <div className="config-name">{ props.name }</div> */}
                    <div className="config-description">{ props.description }</div>
                    <div className="ui-pills-container">
                        <For each={ props.access_info_items }>
                            {item =>
                                <div
                                    classList={{
                                        "ui-pill": true,
                                        "ui-w-title": true,
                                        [`c-${ item.type === "custom" ? item.color : ACCESS_INFO_ITEMS[item.type].color }`]: true
                                    }}
                                    title={ item.title }
                                >
                                    <div className="icon"><span class="material-icons-round">
                                        { item.type === "custom" ? item.icon : ACCESS_INFO_ITEMS[item.type].icon }
                                    </span></div>
                                    <div className="text">
                                        { item.type === "custom" ? item.text : ACCESS_INFO_ITEMS[item.type].text }
                                    </div>
                                </div>
                            }
                        </For>
                    </div>
                </div>
                <div className="right">
                    <div className="config-value-container">
                        <div className="edit-hint">
                            <span class="material-icons-round">{ drawerShown() ? "expand_less" : "edit" }</span>
                        </div>
                        <div className="config-value">
                            { props.value }
                        </div>
                    </div>
                </div>
            </div>

            <PanelDrawer panel_ref={ panel_ref }>
                <form {...register_form()}>
                    <Input
                        label={ props.title }
                        placeholder={ props.value || "" }

                        { ...link("value") }
                    />

                    <div className="drawer-spacer">
                        <span class="material-icons-round">south</span>
                        <span class="material-icons-round">save</span>
                    </div>

                    <Input
                        label="Summary // reasoning"
                        placeholder="My boss asked me to..."

                        { ...link("summary") }

                        with_button={{
                            text: "Commit edit",

                            onclick: submit
                        }}
                    />
                </form>
            </PanelDrawer>
        </Panel>
    )
}

export default ConfigItem;
