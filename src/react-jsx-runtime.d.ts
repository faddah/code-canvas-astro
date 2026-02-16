declare module 'react/jsx-runtime' {
  import { ReactElement, ReactNode } from 'react';

  export namespace JSX {
    interface Element extends ReactElement<any, any> {}
    interface ElementClass {
      render(): ReactNode;
    }
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }

  export function jsx(
    type: any,
    props: any,
    key?: string | number
  ): ReactElement;

  export function jsxs(
    type: any,
    props: any,
    key?: string | number
  ): ReactElement;

  export const Fragment: symbol;
}

declare module 'react/jsx-dev-runtime' {
  export * from 'react/jsx-runtime';
  import { ReactElement } from 'react';

  export function jsxDEV(
    type: any,
    props: any,
    key?: string | number,
    isStaticChildren?: boolean,
    source?: any,
    self?: any
  ): ReactElement;
}
