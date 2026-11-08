import type { Section } from "./types";

export const sections: Section[] = [
  {
    slug: "cosmos",
    name: "Cosmos",
    description:
      "Cosmology and astrophysics: the age, shape and contents of the universe, and the arguments over how we measure them.",
    line: { label: "Doubly ionized oxygen", nm: 500.7 },
  },
  {
    slug: "planets",
    name: "Planets",
    description:
      "Planetary science in our solar system and beyond, from the oceans under icy moons to the atmospheres of worlds we will never visit.",
    line: { label: "Sodium D", nm: 589.0 },
  },
  {
    slug: "exploration",
    name: "Exploration",
    description:
      "Missions, spacecraft and the people who fly and build them: the engineering of going somewhere and sending word back.",
    line: { label: "Hydrogen-alpha", nm: 656.3 },
  },
  {
    slug: "physics",
    name: "Physics",
    description:
      "Fundamental physics and the instruments that test it: clocks, colliders, quantum systems and the anomalies that refuse to go away.",
    line: { label: "Hydrogen-beta", nm: 486.1 },
  },
  {
    slug: "life",
    name: "Life",
    description:
      "Astrobiology and the life sciences: how life works at its limits, and what it would take to recognize it somewhere else.",
    line: { label: "Magnesium b", nm: 518.4 },
  },
  {
    slug: "ideas",
    name: "Ideas",
    description:
      "Essays, history and the philosophy of science: how knowledge gets made, who made it, and what it costs us to look.",
    line: { label: "Ionized calcium K", nm: 393.4 },
  },
];
