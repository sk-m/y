import { Component, createSignal, JSX } from "solid-js";
import Button from "../../../components/Button";
import FlipText from "../../../components/FilpText";
import Panel, { PanelDrawer } from "../../../components/Panel";

const FeatureCard: Component<{
    icon_svg: string;
    icon_name: string;

    feature_enabled: boolean;

    feature_name: string;
    feature_description: Element | JSX.Element | string;
}> = props => {
    let panel_ref;

    const [drawerShown, setDrawerShown] = createSignal(false);
    const toggleDrawerShown = () => setDrawerShown(s => !s);

    return (
        <Panel
            panel_ref={ ref => { panel_ref = ref } }
            drawer_shown={ drawerShown() }

            classList={{ "feature-card": true, "feature-disabled": !props.feature_enabled, "ui-fliptext-alternator": true }}
        
            max_width="900px"
            padding="large"

            panel_info_items={[
                { icon_name: "code", text: "WIP", color: "gray" }
            ]}
        >
            <div className="card-sides" onclick={ toggleDrawerShown }>
                <div className="icon-container">
                    <div className="circle-bkg">
                        <div className="icon-repeat" style={{ "background-image": `url(${ props.icon_svg })` }}></div>
                    </div>
                    <div className="icon">
                        <span class="material-icons-round">{ props.icon_name }</span>
                    </div>
                </div>
                <div className="info-container">
                    <div className="text">
                        <div className="feature-name">{ props.feature_name }</div>
                        <div className="feature-description">
                            { props.feature_description }
                        </div>
                    </div>
                    <FlipText
                        main_content={
                            props.feature_enabled
                            ? (
                                <span className="ui-tc-green ui-text-w-icon-l">
                                    <span class="material-icons-round">done_all</span>
                                    This feature is enabled
                                </span>
                            )
                            :  (
                                <span className="ui-text-w-icon-l">
                                    <span class="material-icons-round">close</span>
                                    This feature is disabled
                                </span>
                            )
                        }
                        alternate_content={
                            props.feature_enabled
                            ? (
                                <span className="ui-text-w-icon-l">
                                    <span class="material-icons-round">toggle_on</span>
                                    Click to disable this feature...
                                </span>
                            )
                            : (
                                <span className="ui-text-w-icon-l">
                                    <span class="material-icons-round">toggle_off</span>
                                    Click to enable this feature...
                                </span>
                            )
                        }
                    />
                </div>
            </div>

            <PanelDrawer panel_ref={ panel_ref }>
                <div className="content ui-between center">
                    <div className="info">
                        <div className="ui-text">
                            You are about to { props.feature_enabled ? "disable" : "enable" } the <span className="w-500">{ props.feature_name }</span> feature. Are you sure?
                        </div>
                    </div>
                    <Button text_color="red" text={ props.feature_enabled ? "Disable" : "Enable" } />
                </div>
            </PanelDrawer>
        </Panel>
    )
}

export default FeatureCard;
