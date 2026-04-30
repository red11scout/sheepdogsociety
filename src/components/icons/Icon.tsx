import { type SVGProps } from "react";
import { cn } from "@/lib/utils";

export type IconName =
  | "shield"
  | "brothers"
  | "flame"
  | "scroll"
  | "table"
  | "calendar"
  | "mountain"
  | "map-pin"
  | "menu"
  | "close"
  | "arrow-right"
  | "arrow-up-right"
  | "plus"
  | "check"
  | "chevron-down"
  | "sheepdog-rest"
  | "watchtower"
  | "oak"
  | "lamp"
  | "gate"
  | "compass"
  | "mail"
  | "phone"
  | "download"
  | "heart"
  | "cross"
  | "hands"
  | "message"
  | "info"
  | "help"
  | "search"
  | "anchor"
  | "key"
  | "clock"
  | "locate"
  | "users-group";

const STROKE_GROUP_PROPS = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.25,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const FILL = "currentColor";

const PATHS: Record<IconName, React.ReactElement> = {
  // ============================================================
  // FILLED — logo-derived silhouettes, bold mass, knockout detail
  // ============================================================
  shield: (
    <path
      fill={FILL}
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 1.75L21.75 5V11C21.75 16.42 17.5 21.13 12 22.5C6.5 21.13 2.25 16.42 2.25 11V5L12 1.75ZM11 6.5V10H7.5V12H11V18H13V12H16.5V10H13V6.5H11Z"
    />
  ),
  brothers: (
    <g fill={FILL}>
      <circle cx="8" cy="7.5" r="3" />
      <circle cx="16" cy="7.5" r="3" />
      <path d="M2 21V18.5C2 15.5 5 13 8 13C9.6 13 11.1 13.6 12 14.6C12.9 13.6 14.4 13 16 13C19 13 22 15.5 22 18.5V21H2Z" />
    </g>
  ),
  flame: (
    <path
      fill={FILL}
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 22.5C6.7 22.5 3.5 18.6 3.5 14.4C3.5 9.6 7.6 6.8 9 3C9 6.4 10.5 8.5 12.4 8.5C13.5 8.5 14 7.5 14 5.5C16.6 8.6 20.5 11.7 20.5 15.5C20.5 19.5 17.7 22.5 12 22.5ZM12 19.5C9.6 19.5 8 17.7 8 15.7C8 13.7 10 12.7 11 10.5C11 12.2 12 13.5 13.6 13.5C14.1 15 14.5 16 14.5 17C14.5 18.7 13.5 19.5 12 19.5Z"
    />
  ),
  scroll: (
    <path
      fill={FILL}
      fillRule="evenodd"
      clipRule="evenodd"
      d="M5 4.5C3.34 4.5 2 5.84 2 7.5V8.5H7.5V18.5C7.5 20.16 8.84 21.5 10.5 21.5H19C20.66 21.5 22 20.16 22 18.5V7.5C22 5.84 20.66 4.5 19 4.5H5ZM10 12H17V14H10V12ZM10 16H15V18H10V16ZM5.5 7.5C5.5 7.22 5.72 7 6 7C6.28 7 6.5 7.22 6.5 7.5V8.5H5.5V7.5Z"
    />
  ),
  table: (
    <path
      fill={FILL}
      d="M2 9V12H22V9H2ZM5 13V21H7.5V13H5ZM16.5 13V21H19V13H16.5Z"
    />
  ),
  calendar: (
    <path
      fill={FILL}
      fillRule="evenodd"
      clipRule="evenodd"
      d="M7 2V4H4V21.5H20V4H17V2H15V4H9V2H7ZM6 10H18V19.5H6V10ZM8 12.5V14.5H10V12.5H8ZM12 12.5V14.5H14V12.5H12ZM16 12.5V14.5H14V12.5H16ZM8 16V18H10V16H8ZM12 16V18H14V16H12Z"
    />
  ),
  mountain: (
    <path
      fill={FILL}
      d="M2 21L8.5 7L13 15L17 8L22 21H2ZM10 14.5L12 18L13.5 15L11.5 11L10 14.5Z"
    />
  ),
  "map-pin": (
    <path
      fill={FILL}
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 1.5C7.86 1.5 4.5 4.86 4.5 9C4.5 14.5 12 22.5 12 22.5C12 22.5 19.5 14.5 19.5 9C19.5 4.86 16.14 1.5 12 1.5ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z"
    />
  ),
  "sheepdog-rest": (
    <path
      fill={FILL}
      fillRule="evenodd"
      clipRule="evenodd"
      d="M3 17.5C3 14.5 5.5 12.5 8.5 12.5C8.7 11 9.6 9.5 11.2 9.5C12.4 9.5 13.5 10.5 13.5 11.7C13.5 12.1 13.4 12.4 13.2 12.6L17.5 12.6C20 12.6 22 14.6 22 17.1V18.5C22 19.6 21.1 20.5 20 20.5H5C3.9 20.5 3 19.6 3 18.5V17.5ZM10.5 11C10.2 11 10 11.2 10 11.5C10 11.8 10.2 12 10.5 12C10.8 12 11 11.8 11 11.5C11 11.2 10.8 11 10.5 11Z"
    />
  ),
  watchtower: (
    <path
      fill={FILL}
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2L18 7V11H17V21.5H7V11H6V7L12 2ZM10.5 14H13.5V19H10.5V14ZM8 12.5H16V11.5H8V12.5Z"
    />
  ),
  oak: (
    <path
      fill={FILL}
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C10.7 2 9.5 2.6 8.7 3.6C6.3 3.6 4.5 5.4 4.5 7.5C4.5 10.5 7.5 12.5 11 12.7V21.5H13V12.7C16.5 12.5 19.5 10.5 19.5 7.5C19.5 5.4 17.7 3.6 15.3 3.6C14.5 2.6 13.3 2 12 2Z"
    />
  ),
  lamp: (
    <path
      fill={FILL}
      fillRule="evenodd"
      clipRule="evenodd"
      d="M11 1.5V6.5H7.5L6 10.5H18L16.5 6.5H13V1.5H11ZM6 10.5V14.5C6 17.5 8.5 19.5 11 19.5V21.5H13V19.5C15.5 19.5 18 17.5 18 14.5V10.5H6Z"
    />
  ),
  gate: (
    <path
      fill={FILL}
      d="M2 6V8H4V20H6V8H18V20H20V8H22V6H2ZM7 9V12H17V9H7ZM7 13V20H17V13H7Z"
    />
  ),
  compass: (
    <path
      fill={FILL}
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 1.75C6.34 1.75 1.75 6.34 1.75 12C1.75 17.66 6.34 22.25 12 22.25C17.66 22.25 22.25 17.66 22.25 12C22.25 6.34 17.66 1.75 12 1.75ZM16.5 7.5L13 13L7.5 16.5L11 11L16.5 7.5Z"
    />
  ),
  heart: (
    <path
      fill={FILL}
      d="M12 21.5C6.5 17.7 2.5 14 2.5 9.4C2.5 6.4 5 4 8 4C10 4 11.4 5 12 6C12.6 5 14 4 16 4C19 4 21.5 6.4 21.5 9.4C21.5 14 17.5 17.7 12 21.5Z"
    />
  ),
  cross: <path fill={FILL} d="M10 2V8H4V14H10V22H14V14H20V8H14V2H10Z" />,
  hands: (
    <path
      fill={FILL}
      fillRule="evenodd"
      clipRule="evenodd"
      d="M9 5C9 3.9 9.9 3 11 3C12.1 3 13 3.9 13 5V13H9V5ZM15 5C15 3.9 14.1 3 13 3C12.7 3 12.4 3.1 12.1 3.2C12.7 3.7 13 4.3 13 5V13H15V5ZM3 11C3 9.9 3.9 9 5 9H9V13H3V11ZM21 11C21 9.9 20.1 9 19 9H15V13H21V11ZM3 14C3 18.4 7 22 12 22C17 22 21 18.4 21 14H3Z"
    />
  ),
  message: (
    <path
      fill={FILL}
      fillRule="evenodd"
      clipRule="evenodd"
      d="M3 4.5H21V17.5H10.5L5 22V17.5H3V4.5ZM7 8.5V10.5H17V8.5H7ZM7 12.5V14.5H14V12.5H7Z"
    />
  ),
  info: (
    <path
      fill={FILL}
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 1.75C6.34 1.75 1.75 6.34 1.75 12C1.75 17.66 6.34 22.25 12 22.25C17.66 22.25 22.25 17.66 22.25 12C22.25 6.34 17.66 1.75 12 1.75ZM11 11V17H13V11H11ZM12 6.5C11.17 6.5 10.5 7.17 10.5 8C10.5 8.83 11.17 9.5 12 9.5C12.83 9.5 13.5 8.83 13.5 8C13.5 7.17 12.83 6.5 12 6.5Z"
    />
  ),
  help: (
    <path
      fill={FILL}
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 1.75C6.34 1.75 1.75 6.34 1.75 12C1.75 17.66 6.34 22.25 12 22.25C17.66 22.25 22.25 17.66 22.25 12C22.25 6.34 17.66 1.75 12 1.75ZM12 5.5C9.79 5.5 8 7.29 8 9.5H10C10 8.4 10.9 7.5 12 7.5C13.1 7.5 14 8.4 14 9.5C14 10.5 12.5 10.8 11.5 12C11 12.6 11 13.4 11 14.5H13C13 13.4 13 13.4 13.5 12.8C14.5 11.6 16 11 16 9.5C16 7.29 14.21 5.5 12 5.5ZM11 16V18H13V16H11Z"
    />
  ),
  mail: (
    <path
      fill={FILL}
      fillRule="evenodd"
      clipRule="evenodd"
      d="M2 5H22V19H2V5ZM4.5 7L12 12.5L19.5 7H4.5Z"
    />
  ),
  phone: (
    <path
      fill={FILL}
      d="M5 3H9.5L11.5 8.5L8.5 10.5C9.5 13 11 14.5 13.5 15.5L15.5 12.5L21 14.5V19C21 20.1 20.1 21 19 21C10.7 21 4 14.3 4 6V5C4 3.9 4.9 3 5 3Z"
    />
  ),
  download: (
    <path
      fill={FILL}
      d="M11 4V13.4L7.5 9.9L6 11.5L12 17.5L18 11.5L16.5 9.9L13 13.4V4H11ZM4 19V21H20V19H4Z"
    />
  ),
  anchor: (
    <path
      fill={FILL}
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C10.34 2 9 3.34 9 5C9 6.31 9.84 7.42 11 7.83V10H8V12H11V19.91C9.31 19.74 7.69 19.07 6.36 17.95L8 16H4V20L5.05 18.95C7.04 20.71 9.55 22 12 22C14.45 22 16.96 20.71 18.95 18.95L20 20V16H16L17.64 17.95C16.31 19.07 14.69 19.74 13 19.91V12H16V10H13V7.83C14.16 7.42 15 6.31 15 5C15 3.34 13.66 2 12 2Z"
    />
  ),
  key: (
    <path
      fill={FILL}
      fillRule="evenodd"
      clipRule="evenodd"
      d="M7 7C3.69 7 1 9.69 1 13C1 16.31 3.69 19 7 19C9.39 19 11.45 17.6 12.43 15.58L15 18V20H17V18.5L18.5 17V15H22.5V12H10.43C9.45 9.97 7.39 8.58 5 8.58C5 8.58 7 7 7 7ZM7 11C8.66 11 10 12.34 10 14C10 15.66 8.66 17 7 17C5.34 17 4 15.66 4 14C4 12.34 5.34 11 7 11Z"
    />
  ),
  clock: (
    <path
      fill={FILL}
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 1.75C6.34 1.75 1.75 6.34 1.75 12C1.75 17.66 6.34 22.25 12 22.25C17.66 22.25 22.25 17.66 22.25 12C22.25 6.34 17.66 1.75 12 1.75ZM11 6V12.5L16.2 15.5L17 14L13 11.6V6H11Z"
    />
  ),
  "users-group": (
    <g fill={FILL}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 21V18.5C5 15.5 8.13 13 12 13C15.87 13 19 15.5 19 18.5V21H5Z" />
    </g>
  ),

  // ============================================================
  // STROKE — UI utility (modern, crisp, stays as outlines)
  // ============================================================
  menu: (
    <g {...STROKE_GROUP_PROPS}>
      <path d="M3 7H21" />
      <path d="M3 12H21" />
      <path d="M3 17H21" />
    </g>
  ),
  close: (
    <g {...STROKE_GROUP_PROPS}>
      <path d="M5 5L19 19" />
      <path d="M19 5L5 19" />
    </g>
  ),
  "arrow-right": (
    <g {...STROKE_GROUP_PROPS}>
      <path d="M4 12H20" />
      <path d="M14 6L20 12L14 18" />
    </g>
  ),
  "arrow-up-right": (
    <g {...STROKE_GROUP_PROPS}>
      <path d="M6 18L18 6" />
      <path d="M8 6H18V16" />
    </g>
  ),
  plus: (
    <g {...STROKE_GROUP_PROPS}>
      <path d="M12 4V20" />
      <path d="M4 12H20" />
    </g>
  ),
  check: (
    <g {...STROKE_GROUP_PROPS}>
      <path d="M4 12L10 18L20 6" />
    </g>
  ),
  "chevron-down": (
    <g {...STROKE_GROUP_PROPS}>
      <path d="M5 9L12 16L19 9" />
    </g>
  ),
  search: (
    <g {...STROKE_GROUP_PROPS}>
      <circle cx="11" cy="11" r="7" />
      <path d="M16 16L21 21" />
    </g>
  ),
  locate: (
    <g {...STROKE_GROUP_PROPS}>
      <path d="M12 2V5" />
      <path d="M12 19V22" />
      <path d="M2 12H5" />
      <path d="M19 12H22" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </g>
  ),
};

interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  size?: number | string;
  /** Ignored for filled icons; only affects stroke variants. */
  strokeWidth?: number;
}

export function Icon({
  name,
  size = 24,
  className,
  ...rest
}: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={cn("shrink-0", className)}
      aria-hidden="true"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
