import type { GradientScheme } from "./gradient-types";

export const gradientTypeOverrides: Record<
  string,
  Pick<GradientScheme, "type">
> = {
  "027": {
    type: "radial",
  },
  "111": {
    type: "radial",
  },
};

export const gradientExtras: GradientScheme[] = [
  {
    name: "Coup de Grace",
    favorite: false,
    index: "040",
    deg: 0,
    group: ["#DCD9D4"],
    type: "linear",
    gradient: [
      { color: "#DCD9D4", pos: 0 },
      { color: "rgba(255, 255, 255, 0.50)", pos: 0 },
      { color: "rgba(0, 0, 0, 0.50)", pos: 100 },
    ],
  },
  {
    name: "Loon Crest",
    favorite: false,
    index: "045",
    deg: 0,
    group: ["#989898"],
    type: "linear",
    gradient: [
      { color: "#989898", pos: 0 },
      { color: "rgba(255,255,255,0.40)", pos: 0 },
      { color: "rgba(0,0,0,0.40)", pos: 120 },
    ],
  },
  {
    name: "Sharp Glass",
    favorite: false,
    index: "074",
    deg: -180,
    group: ["#C9CCD3"],
    type: "linear",
    gradient: [
      { color: "#C9CCD3", pos: 0 },
      { color: "rgba(255, 255, 255, 0.50)", pos: 0 },
      { color: "rgba(0, 0, 0, 0.50)", pos: 100 },
    ],
  },
  {
    name: "Chemic Aqua",
    favorite: false,
    index: "119",
    deg: 0,
    group: ["#CDDCDC"],
    type: "linear",
    gradient: [
      { color: "#CDDCDC", pos: 0 },
      { color: "rgba(255, 255, 255, 0.50)", pos: 0 },
      { color: "rgba(0, 0, 0, 0.50)", pos: 100 },
    ],
  },
  {
    name: "Slick Carbon",
    favorite: false,
    index: "135",
    deg: 0,
    group: ["#323232"],
    type: "linear",
    gradient: [
      { color: "#323232", pos: 0 },
      { color: "#3F3F3F", pos: 40 },
      { color: "#1C1C1C", pos: 150 },
    ],
  },
  {
    name: "Earl Gray",
    favorite: false,
    index: "141",
    deg: 0,
    group: ["#E4E4E1"],
    type: "linear",
    gradient: [
      { color: "#E4E4E1", pos: 0 },
      { color: "rgba(255, 255, 255, 0.1)", pos: 0 },
      { color: "rgba(143, 152, 157, 0.60)", pos: 100 },
    ],
  },
];
