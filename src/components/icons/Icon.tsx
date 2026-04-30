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

const PATHS: Record<IconName, React.ReactElement> = {
  shield: (
    <>
      <path d="M12 2 L21 5 V11 C21 16 17 20.5 12 22 C7 20.5 3 16 3 11 V5 Z" />
      <path d="M12 8 V16" />
    </>
  ),
  brothers: (
    <>
      <circle cx="8.5" cy="7.5" r="2.75" />
      <circle cx="15.5" cy="7.5" r="2.75" />
      <path d="M3 21 V18 C3 15.5 5.5 13.5 8.5 13.5 C9.7 13.5 10.8 13.8 11.7 14.4" />
      <path d="M21 21 V18 C21 15.5 18.5 13.5 15.5 13.5 C14.3 13.5 13.2 13.8 12.3 14.4" />
    </>
  ),
  flame: (
    <>
      <path d="M12 22 C7 22 4 18.5 4 14.5 C4 10 8 7.5 9.5 4 C9.5 7 11 9 12.5 9 C13.5 9 14 8 14 6.5 C16 9 20 12 20 15.5 C20 19 17.5 22 12 22 Z" />
      <path d="M12 22 C9.5 22 8 20 8 18 C8 16 10 15 11 13 C11 14.5 12 15.5 13.5 15.5 C14 17 14.5 18 14.5 19 C14.5 21 13.5 22 12 22 Z" />
    </>
  ),
  scroll: (
    <>
      <path d="M5 5 H19 C20.5 5 21.5 6 21.5 7.5 V8.5 H7.5 V18 C7.5 19.5 6.5 20.5 5 20.5 C3.5 20.5 2.5 19.5 2.5 18 V7.5 C2.5 6 3.5 5 5 5 Z" />
      <path d="M7.5 8.5 V18 C7.5 19.5 8.5 20.5 10 20.5 H19 C20.5 20.5 21.5 19.5 21.5 18 V8.5" />
      <path d="M11 12 H17" />
      <path d="M11 16 H15" />
    </>
  ),
  table: (
    <>
      <path d="M3 9 H21" />
      <path d="M3 9 V12 H21 V9" />
      <path d="M6 12 V20" />
      <path d="M18 12 V20" />
      <path d="M3 16 H21" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="0" />
      <path d="M3 10 H21" />
      <path d="M8 3 V7" />
      <path d="M16 3 V7" />
      <path d="M8 14 H10" />
      <path d="M14 14 H16" />
      <path d="M8 18 H10" />
      <path d="M14 18 H16" />
    </>
  ),
  mountain: (
    <>
      <path d="M2 21 L9 8 L13 14 L17 9 L22 21 Z" />
      <path d="M9 8 L11 11" />
    </>
  ),
  "map-pin": (
    <>
      <path d="M12 22 C12 22 19 15 19 10 C19 6 16 3 12 3 C8 3 5 6 5 10 C5 15 12 22 12 22 Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  menu: (
    <>
      <path d="M3 7 H21" />
      <path d="M3 12 H21" />
      <path d="M3 17 H21" />
    </>
  ),
  close: (
    <>
      <path d="M5 5 L19 19" />
      <path d="M19 5 L5 19" />
    </>
  ),
  "arrow-right": (
    <>
      <path d="M4 12 H20" />
      <path d="M14 6 L20 12 L14 18" />
    </>
  ),
  "arrow-up-right": (
    <>
      <path d="M6 18 L18 6" />
      <path d="M8 6 H18 V16" />
    </>
  ),
  plus: (
    <>
      <path d="M12 4 V20" />
      <path d="M4 12 H20" />
    </>
  ),
  check: <path d="M4 12 L10 18 L20 6" />,
  "chevron-down": <path d="M5 9 L12 16 L19 9" />,
  "sheepdog-rest": (
    <>
      <path d="M4 16 C4 13.5 6 12 8.5 12 C8.5 10 9.7 9 11 9 C12.3 9 13.3 10 13.3 11 C13.3 11.6 13 12 12.5 12.3 H18 C20 12.3 21.5 13.5 21.5 15.5 V17.5 C21.5 18.5 20.5 19 19.5 19 H5.5 C4.7 19 4 18.3 4 17.5 Z" />
      <circle cx="9" cy="11" r="0.5" fill="currentColor" stroke="none" />
      <path d="M21.5 15.5 L23 14" />
    </>
  ),
  watchtower: (
    <>
      <path d="M7 21 V8 L12 4 L17 8 V21 Z" />
      <path d="M7 11 H17" />
      <path d="M11 14 H13 V18 H11 Z" />
      <path d="M5 21 H19" />
    </>
  ),
  oak: (
    <>
      <path d="M12 21 V12" />
      <path d="M12 12 C8 12 5 10 5 7 C5 5 6.5 3.5 8.5 3.5 C9.5 2.5 11 2 12 2 C13 2 14.5 2.5 15.5 3.5 C17.5 3.5 19 5 19 7 C19 10 16 12 12 12 Z" />
      <path d="M9 21 H15" />
    </>
  ),
  lamp: (
    <>
      <path d="M12 3 V7" />
      <path d="M9 7 H15 L17 11 H7 Z" />
      <path d="M7 11 V14 C7 17 9 19 12 19 C15 19 17 17 17 14 V11" />
      <path d="M10 21 H14" />
      <path d="M12 19 V21" />
    </>
  ),
  gate: (
    <>
      <path d="M3 7 V21" />
      <path d="M21 7 V21" />
      <path d="M3 7 H21" />
      <path d="M3 21 H21" />
      <path d="M3 21 L21 7" />
      <path d="M3 14 H21" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M16 8 L13 13 L8 16 L11 11 Z" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="0" />
      <path d="M3 6 L12 13 L21 6" />
    </>
  ),
  phone: (
    <path d="M5 4 H9 L11 9 L8.5 10.5 C9.5 13 11 14.5 13.5 15.5 L15 13 L20 15 V19 C20 19.5 19.5 20 19 20 C11 20 4 13 4 5 C4 4.5 4.5 4 5 4 Z" />
  ),
  download: (
    <>
      <path d="M12 4 V16" />
      <path d="M6 11 L12 17 L18 11" />
      <path d="M4 20 H20" />
    </>
  ),
  heart: (
    <path d="M12 21 C7 17.5 3 14 3 9.5 C3 6.5 5.5 4 8.5 4 C10.5 4 11.5 5 12 6 C12.5 5 13.5 4 15.5 4 C18.5 4 21 6.5 21 9.5 C21 14 17 17.5 12 21 Z" />
  ),
  cross: (
    <>
      <path d="M12 3 V21" />
      <path d="M6 9 H18" />
    </>
  ),
  hands: (
    <>
      <path d="M3 14 V11 C3 10 4 9 5 9 L9 9 V13" />
      <path d="M21 14 V11 C21 10 20 9 19 9 L15 9 V13" />
      <path d="M9 13 V8 C9 7 10 6 11 6 V13" />
      <path d="M15 13 V8 C15 7 14 6 13 6 V13" />
      <path d="M3 14 C3 18 6.5 21 12 21 C17.5 21 21 18 21 14" />
    </>
  ),
  message: (
    <>
      <path d="M4 5 H20 V17 H10 L5 21 V17 H4 Z" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11 V17" />
      <circle cx="12" cy="7.5" r="0.5" fill="currentColor" stroke="none" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9 C9 7 10.5 6 12 6 C13.5 6 15 7 15 9 C15 10.5 13.5 11 12.5 12 C12 12.5 12 13 12 14" />
      <circle cx="12" cy="17" r="0.5" fill="currentColor" stroke="none" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M16 16 L21 21" />
    </>
  ),
  anchor: (
    <>
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7 V21" />
      <path d="M8 11 H16" />
      <path d="M5 14 C5 17 7.5 21 12 21 C16.5 21 19 17 19 14" />
    </>
  ),
  key: (
    <>
      <circle cx="7" cy="13" r="4" />
      <path d="M11 13 H22" />
      <path d="M18 13 V17" />
      <path d="M22 13 V17" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7 V12 L16 14" />
    </>
  ),
  locate: (
    <>
      <path d="M12 2 V5" />
      <path d="M12 19 V22" />
      <path d="M2 12 H5" />
      <path d="M19 12 H22" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </>
  ),
  "users-group": (
    <>
      <circle cx="12" cy="8" r="3" />
      <path d="M5 21 V18 C5 15 8 13 12 13 C16 13 19 15 19 18 V21" />
    </>
  ),
};

interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  size?: number | string;
  strokeWidth?: number;
}

export function Icon({
  name,
  size = 24,
  strokeWidth = 2.25,
  className,
  ...rest
}: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="square"
      strokeLinejoin="miter"
      className={cn("shrink-0", className)}
      aria-hidden="true"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
