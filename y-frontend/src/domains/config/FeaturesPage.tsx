import { Component } from "solid-js";
import Panel from "../../components/Panel";

import AutoStoriesWhiteSVG from "../../assets/icons/auto_stories_white.svg"
import FolderZipWhiteSVG from "../../assets/icons/folder_zip_white.svg"
import LanWhiteSVG from "../../assets/icons/lan_white.svg"
import ConfirmationNumberWhiteSVG from "../../assets/icons/confirmation_number_white.svg"

import FlipText from "../../components/FilpText";
import FeatureCard from "./features-page/FeatureCard";

const FeaturesPage: Component = props => {
    return (
        <div id="config-features-page" className="ui-domain-page">
            <div className="page-header">
                <span className="title ui-text-w-icon-l">
                    <span class="material-icons-round">electric_bolt</span>
                    Features
                </span>
                <div className="description">These are the features that come packaged with Y. Feel free to disable the ones you don't plan on using.</div>

                <span className="description ui-text-w-icon-l">
                    <span class="material-icons-round">lightbulb_outline</span>
                    Keep in mind that disabling a feature will not result in any data loss.
                </span>
            </div>
            <div className="feature-cards-container">
                <FeatureCard
                    icon_svg={ AutoStoriesWhiteSVG }
                    icon_name="auto_stories"
                    
                    feature_enabled={ true }

                    feature_name="Wiki // Documentation"
                    feature_description={<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut neque urna, dignissim eget lacus sit amet, consequat ornare nisi. Morbi laoreet orci neque, id dapibus diam bibendum ut. Nullam convallis eros ut enim imperdiet convallis. Donec ultrices cursus mi eu tempor. Nulla mattis at tortor eu lobortis. Praesent sed velit a ante tincidunt tempor. Morbi sit amet sem in dui lobortis dignissim. Vivamus quis massa semper, faucibus leo a, semper lacus. Morbi laoreet dolor quis tortor blandit, non sagittis leo luctus. Nunc vestibulum mattis nunc at elementum. Nullam convallis mauris eu vehicula rutrum.</p>}
                />

                <FeatureCard
                    icon_svg={ FolderZipWhiteSVG }
                    icon_name="folder_zip"
                    
                    feature_enabled={ false }

                    feature_name="Storage"
                    feature_description={<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut neque urna, dignissim eget lacus sit amet, consequat ornare nisi. Morbi laoreet orci neque, id dapibus diam bibendum ut. Nullam convallis eros ut enim imperdiet convallis. Donec ultrices cursus mi eu tempor. Nulla mattis at tortor eu lobortis. Praesent sed velit a ante tincidunt tempor. Morbi sit amet sem in dui lobortis dignissim. Vivamus quis massa semper, faucibus leo a, semper lacus. Morbi laoreet dolor quis tortor blandit, non sagittis leo luctus. Nunc vestibulum mattis nunc at elementum. Nullam convallis mauris eu vehicula rutrum.</p>}
                />

                <FeatureCard
                    icon_svg={ LanWhiteSVG }
                    icon_name="lan"
                    
                    feature_enabled={ true }

                    feature_name="Database // Semantic data source"
                    feature_description={<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut neque urna, dignissim eget lacus sit amet, consequat ornare nisi. Morbi laoreet orci neque, id dapibus diam bibendum ut. Nullam convallis eros ut enim imperdiet convallis. Donec ultrices cursus mi eu tempor. Nulla mattis at tortor eu lobortis. Praesent sed velit a ante tincidunt tempor. Morbi sit amet sem in dui lobortis dignissim. Vivamus quis massa semper, faucibus leo a, semper lacus. Morbi laoreet dolor quis tortor blandit, non sagittis leo luctus. Nunc vestibulum mattis nunc at elementum. Nullam convallis mauris eu vehicula rutrum.</p>}
                />

                <FeatureCard
                    icon_svg={ ConfirmationNumberWhiteSVG }
                    icon_name="confirmation_number"
                    
                    feature_enabled={ false }

                    feature_name="Ticketing // Feedback system"
                    feature_description={<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut neque urna, dignissim eget lacus sit amet, consequat ornare nisi. Morbi laoreet orci neque, id dapibus diam bibendum ut. Nullam convallis eros ut enim imperdiet convallis. Donec ultrices cursus mi eu tempor. Nulla mattis at tortor eu lobortis. Praesent sed velit a ante tincidunt tempor. Morbi sit amet sem in dui lobortis dignissim. Vivamus quis massa semper, faucibus leo a, semper lacus. Morbi laoreet dolor quis tortor blandit, non sagittis leo luctus. Nunc vestibulum mattis nunc at elementum. Nullam convallis mauris eu vehicula rutrum.</p>}
                />
            </div>
        </div>
    )
}

export default FeaturesPage;
