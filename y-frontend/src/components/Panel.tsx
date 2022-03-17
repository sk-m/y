import { Component } from "solid-js";

const Panel: Component = props => {
    return (
        <div className="ui-panel">
            { props.children }
        </div>
    )
}

export default Panel;
