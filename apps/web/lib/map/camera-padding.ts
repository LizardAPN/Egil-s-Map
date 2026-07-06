import type { PaddingOptions } from "mapbox-gl";

export const TIMELINE_PANEL_WIDTH = 320;

const BASE_PADDING = 80;

export function getTimelineCameraPadding(collapsed: boolean): PaddingOptions {
  return {
    left: collapsed ? BASE_PADDING : TIMELINE_PANEL_WIDTH + 20,
    top: BASE_PADDING,
    right: BASE_PADDING,
    bottom: BASE_PADDING,
  };
}
