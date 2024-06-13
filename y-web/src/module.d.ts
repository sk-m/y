/* eslint-disable @typescript-eslint/consistent-type-definitions */
import { Component, JSX as SolidJSX } from "solid-js"

type ComponentWithChildren<P = unknown> = Component<
  {
    children?: SolidJSX.Element
  } & P
>

declare module "solid-js" {
  namespace JSX {
    interface InputHTMLAttributes<T> extends SolidJSX.InputHTMLAttributes<T> {
      directory?: boolean
      webkitdirectory?: boolean
    }

    interface VideoHTMLAttributes<T> extends SolidJSX.VideoHTMLAttributes<T> {
      controlsList?: string
    }

    interface AudioHTMLAttributes<T> extends SolidJSX.AudioHTMLAttributes<T> {
      controlsList?: string
    }
  }
}
