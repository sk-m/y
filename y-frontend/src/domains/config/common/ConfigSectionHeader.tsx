import { Component, Show } from "solid-js";
import Panel from "../../../components/Panel";

const ConfigSectionHeader: Component<{
    icon_svg?: string;
    icon_name?: string;

    title: string;
    description: string;

    max_width?: string;
}> = props => {
    return (
        <Panel
            classList={{ "config-section-header": true }}
            is_list_item={ true }
            
            max_width={ props.max_width ?? "900px" }
        >
            <div className="panel-sides">
                <div className="info-container">
                    <div className="section-title">{ props.title }</div>
                    <div className="section-description">{ props.description }</div>
                </div>
                <Show when={ props.icon_name && props.icon_svg }>
                    <div className="icon-container">
                        <div className="circle-bkg">
                            { /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */ }
                            <div className="icon-repeat" style={{ "background-image": `url(${ props.icon_svg! })` }}></div>
                        </div>
                        <div className="icon">
                            <span class="material-icons-round">{ props.icon_name }</span>
                        </div>
                    </div>
                </Show>
            </div>
        </Panel>
    )
}

export default ConfigSectionHeader;
