declare type ClassList = Record<string, boolean | undefined>;

declare type InputEventHandler<T = HTMLInputElement, E = KeyboardEvent> = import("solid-js").JSX.EventHandlerUnion<T, E>;
declare type MouseEventHandler<T = HTMLButtonElement, E = MouseEvent> = import("solid-js").JSX.EventHandlerUnion<T, E>;
