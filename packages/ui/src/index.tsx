import { Fragment, type ReactNode, type ReactElement } from "react";

export interface ScreenContainerProps {
  children: ReactNode;
}

export function ScreenContainer({ children }: ScreenContainerProps): ReactElement {
  return <Fragment>{children}</Fragment>;
}
