import { Component, JSX } from "solid-js";

const FlipText: Component<{
    main_content: Element | JSX.Element;
    alternate_content: Element | JSX.Element;
}> = props => {
    return (
        <div className="ui-fliptext">
            <div className="main">{ props.main_content }</div>
            <div className="alternate">{ props.alternate_content }</div>
        </div>
    )
}

export default FlipText;
