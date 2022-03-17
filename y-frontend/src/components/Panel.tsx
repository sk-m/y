import { Component } from "solid-js";
import { classList } from "solid-js/web";

const Panel: Component<{
    classList?: any
}> = props => {
    return (
        <div classList={{ "ui-panel": true, ...props.classList }}>
            <div className="content">
                { props.children }
            </div>
        </div>
    )
}

export default Panel;
