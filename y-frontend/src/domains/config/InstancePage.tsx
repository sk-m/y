import { Component } from "solid-js";
import Panel from "../../components/Panel";
import ConfigItem from "./features-page/ConfigItem";
import ConfigSectionHeader from "./features-page/ConfigSectionHeader";
import SettingsWhiteSVG from "../../assets/icons/settings_white.svg"
import PaletteWhiteSVG from "../../assets/icons/palette_white.svg"

const InstancePage: Component = props => {
    return (
        <div id="config-instance-page" className="ui-domain-page config-items-page">
            <div className="page-header">
                <span className="title ui-text-w-icon-l">
                    <span class="material-icons-round">domain</span>
                    Instance
                </span>
                <div className="description">General configuration of this y instance.</div>
            </div>
            <div className="config-items-container">
                <div className="config-section">
                    <ConfigSectionHeader
                        icon_name="settings"
                        icon_svg={ SettingsWhiteSVG }

                        title="General"
                        description="Core instance configuration items"
                    />
                    <ConfigItem
                        name="instance_id"
                        title="Instance id"
                        description="Internal name of this instance, will not be visible in the UI."

                        value_type="string"
                        value="test_1"

                        access_info_items={[
                            {
                                type: "readable",
                                title: "Readable by: sysop."
                            },
                            {
                                type: "writeable",
                                title: "Editable by: sysop."
                            },
                            {
                                type: "dangerous",
                                title: "Editing this item can lead to errors. Make sure you know what you are doing."
                            },
                        ]}
                    />
                    <ConfigItem
                        name="instance_name"
                        title="Instance name"
                        description="Display name of this instance."

                        value_type="string"
                        value="Test instance"

                        access_info_items={[
                            {
                                type: "readable",
                                title: "Readable by: sysop."
                            },
                            {
                                type: "writeable",
                                title: "Editable by: sysop."
                            },
                        ]}
                    />
                </div>

                <div className="config-section">
                    <ConfigSectionHeader
                        icon_name="palette"
                        icon_svg={ PaletteWhiteSVG }

                        title="Look & feel"
                        description="Customize how this instance looks"
                    />
                    <ConfigItem
                        name="accent_color"
                        title="Accent color"
                        description="Color that will be primarily used in the UI."

                        value_type="string"
                        value="#0000FF"

                        access_info_items={[
                            {
                                type: "readable",
                                title: "Readable by: sysop."
                            },
                            {
                                type: "writeable",
                                title: "Editable by: sysop."
                            },
                        ]}
                    />
                </div>
            </div>
        </div>
    )
} 

export default InstancePage;
