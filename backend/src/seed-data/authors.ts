import type { Author } from "./types";

// The shared byline for stories prepared in-house. Add real contributors in the
// admin panel; do not add invented people here.
export const authors: Author[] = [
  {
    slug: "cosmoslens-editors",
    name: "CosmosLens Editors",
    role: "Editorial team",
    shortBio: "Stories prepared and checked by the CosmosLens editorial team.",
    bio: [
      "CosmosLens Editors is the shared byline of our editorial team. Stories under this name are prepared in-house from published research, mission data and agency records. AI tools assist with research and drafting, and every story is checked against its sources before it is published.",
      "To report an error or suggest a story, see our editorial standards or get in touch through the contact page.",
    ],
    location: "",
    expertise: ["Cosmology", "Planetary science", "Space exploration", "Physics", "Astrobiology", "History of science"],
  },
];
