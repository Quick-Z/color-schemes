export type GradientStop = {
  color: string;
  pos: number;
};

export type GradientType = "linear" | "radial" | "conic";

export type ColorFilter =
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "indigo"
  | "purple"
  | "black"
  | "white";

export type GradientScheme = {
  id?: number;
  name: string;
  favorite: boolean;
  index: string;
  deg: number;
  group: string[];
  gradient: GradientStop[];
  type?: GradientType;
  colorTags?: ColorFilter[];
};
