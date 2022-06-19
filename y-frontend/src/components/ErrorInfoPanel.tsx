import { Component } from "solid-js";

const ErrorInfoPanel: Component<{
    message?: string;
    
    title?: string;
}> = props => {
    return (
        <div className="ui-info-panel c-red" hidden={ !props.message }>
            <div className="title">
                <span class="material-icons">report</span>
                { props.title ?? "Error" }
            </div>
            <div className="keyvalue">
                <div className="key">Message:</div>
                <div className="value">{ props.message }</div>
            </div>
        </div>
    )
}

export default ErrorInfoPanel;
