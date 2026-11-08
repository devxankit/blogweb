import type { Author } from "./types";

// Mock contributors. Replace with real author records from the backend.
export const authors: Author[] = [
  {
    slug: "ruth-aldana",
    name: "Ruth Aldana",
    role: "Editor-in-chief",
    shortBio: "Ruth edits CosmosLens and writes about the history and philosophy of science.",
    bio: [
      "Ruth Aldana is the founding editor of CosmosLens. She spent a decade as a science editor at general-interest magazines before deciding that the best science writing deserved a home of its own.",
      "She writes about how scientific knowledge is made, argued over and occasionally unmade, with a particular interest in the people history left out of the footnotes.",
    ],
    location: "Lisbon",
    expertise: ["History of astronomy", "Philosophy of science", "Editing"],
  },
  {
    slug: "mara-okonkwo",
    name: "Mara Okonkwo",
    role: "Cosmology correspondent",
    shortBio: "Mara covers cosmology, dark energy and the measurement problems at the edge of the observable universe.",
    bio: [
      "Mara Okonkwo trained as an astrophysicist and spent four years on a galaxy survey before moving into journalism. She covers cosmology for CosmosLens.",
      "Her reporting focuses on the places where precise measurements disagree, and on what it takes for a field to decide whether a tension is a mistake or a discovery.",
    ],
    location: "Cape Town",
    expertise: ["Cosmology", "Galaxy surveys", "Statistics"],
  },
  {
    slug: "tobias-lindqvist",
    name: "Tobias Lindqvist",
    role: "Planetary science editor",
    shortBio: "Tobias writes about planets, moons and the missions sent to study them.",
    bio: [
      "Tobias Lindqvist is the planetary science editor at CosmosLens. Before journalism he worked on instrument calibration for a European Mars mission.",
      "He is interested in planets as systems, in how atmospheres, oceans and interiors talk to one another, and in the long patience of mission science.",
    ],
    location: "Uppsala",
    expertise: ["Planetary atmospheres", "Icy moons", "Exoplanets"],
  },
  {
    slug: "ines-valcourt",
    name: "Inès Valcourt",
    role: "Physics writer",
    shortBio: "Inès writes about precision measurement, particle physics and the instruments that make both possible.",
    bio: [
      "Inès Valcourt writes about physics for CosmosLens, with a soft spot for experiments that take twenty years and a building the size of a hangar.",
      "She studied experimental physics and still reads error budgets for pleasure.",
    ],
    location: "Geneva",
    expertise: ["Particle physics", "Metrology", "Quantum optics"],
  },
  {
    slug: "daniel-achterberg",
    name: "Daniel Achterberg",
    role: "Exploration correspondent",
    shortBio: "Daniel covers spaceflight, deep-space missions and the engineering culture behind them.",
    bio: [
      "Daniel Achterberg reports on space exploration, from mission planning rooms to the antenna complexes that keep in touch with spacecraft decades after launch.",
      "He is working on a book about the engineers who keep old spacecraft alive.",
    ],
    location: "Houston",
    expertise: ["Spaceflight", "Mission operations", "Space policy"],
  },
  {
    slug: "sofia-mendel",
    name: "Sofia Mendel",
    role: "Life sciences writer",
    shortBio: "Sofia writes about astrobiology, extremophiles and the question of what counts as alive.",
    bio: [
      "Sofia Mendel covers the life sciences and astrobiology for CosmosLens. She holds a doctorate in microbial ecology.",
      "Her work asks how we would recognize life that does not resemble ours, and how much of what we call life is really a set of habits.",
    ],
    location: "Edinburgh",
    expertise: ["Astrobiology", "Extremophiles", "Microbiology"],
  },
];
