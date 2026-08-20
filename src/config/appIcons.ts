import classicIcon from "../assets/app-icons/classic.png";
import meimeiGreenIcon from "../assets/app-icons/meimei-green.png";
import type { AppIconStyle } from "../domain/types";

export const APP_ICON_OPTIONS: Array<{
  value: AppIconStyle;
  label: string;
  description: string;
  src: string;
}> = [
  {
    value: "meimeiGreen",
    label: "绿色煤煤",
    description: "新生成的情侣头像风格",
    src: meimeiGreenIcon,
  },
  {
    value: "classic",
    label: "经典图标",
    description: "保留原来的番茄钟图标",
    src: classicIcon,
  },
];

export const APP_ICON_SOURCES: Record<AppIconStyle, string> = {
  meimeiGreen: meimeiGreenIcon,
  classic: classicIcon,
};
