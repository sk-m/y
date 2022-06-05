import { Component } from "solid-js";

const FlipText: Component<{
    main_content: any;
    alternate_content: any;
}> = props => {
    return (
        <div className="ui-fliptext">
            <div className="main">{ props.main_content }</div>
            <div className="alternate">{ props.alternate_content }</div>
        </div>
    )
}

export default FlipText;
