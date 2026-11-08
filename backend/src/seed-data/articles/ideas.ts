import type { Article } from "../types";

export const ideas: Article[] = [
  {
    slug: "henrietta-leavitts-ruler",
    title: "Henrietta Leavitt’s ruler",
    dek: "Working for a few cents an hour on glass plates of the southern sky, Henrietta Swan Leavitt found the relationship that let astronomers measure the universe. Her name was not on the paper that announced it.",
    seoDescription:
      "How Henrietta Swan Leavitt discovered the Cepheid period-luminosity relation that made it possible to measure cosmic distances, and why her credit came so late.",
    section: "ideas",
    format: "Profile",
    author: "ruth-aldana",
    publishedAt: "2026-10-01T08:00:00Z",
    cover: {
      image: "harvard-computers",
      alt: "Black-and-white photograph of women seated at desks with ledgers and magnifiers in an office at Harvard College Observatory.",
      caption: "The women computers of Harvard College Observatory, who measured and classified hundreds of thousands of stars on photographic plates.",
    },
    tags: ["Henrietta Swan Leavitt", "History of astronomy", "Cepheids", "Women in science"],
    body: [
      { type: "p", html: "At the turn of the twentieth century, Harvard College Observatory was photographing the sky faster than anyone could study it. Its director, Edward Pickering, hired women to examine the glass plates: to measure the brightness and position of stars, classify their spectra and record the results in ledgers. They were called computers, and they were paid a fraction of what a male assistant would earn." },
      { type: "p", html: "Henrietta Swan Leavitt joined in 1895, first as a volunteer, then as a paid employee. She had studied at Radcliffe, then known as the Society for the Collegiate Instruction of Women, and had taken a course in astronomy. Pickering assigned her to variable stars, which change in brightness over time." },
      {
        type: "figure",
        size: "column",
        picture: {
          image: "leavitt-portrait",
          alt: "Black-and-white portrait photograph of Henrietta Swan Leavitt in a high-collared white blouse, looking directly at the camera.",
          caption: "Henrietta Swan Leavitt (1868–1921).",
        },
      },
      { type: "h2", text: "Stars at the same distance" },
      { type: "p", html: "Leavitt studied plates of the Magellanic Clouds, two small galaxies visible from the Southern Hemisphere, taken at Harvard’s station in Peru. Comparing plates taken on different nights, she found variable stars by the hundred. In 1908 she published a catalog of 1,777 of them, and added an observation almost in passing: the brighter variables seemed to have longer periods." },
      { type: "p", html: "The insight was in recognizing why that mattered. All the stars in the Small Magellanic Cloud are at roughly the same distance from Earth, so differences in their apparent brightness reflect real differences in how luminous they are. In 1912 she showed, using 25 of these stars, that their period and luminosity follow a tight relationship. Measure how long a Cepheid takes to pulse, and you know how bright it truly is. Compare that with how bright it appears, and you know how far away it is." },
      { type: "quote", text: "Measure how long a Cepheid takes to pulse, and you know how bright it truly is." },
      {
        type: "figure",
        size: "column",
        picture: {
          image: "leavitt-plot",
          alt: "Two hand-plotted graphs showing the brightness of variable stars rising steadily with their period.",
          caption: "The figures from the 1912 Harvard circular, showing brightness against period for Cepheids in the Small Magellanic Cloud.",
        },
      },
      { type: "h2", text: "A ruler for the universe" },
      { type: "p", html: "The result was published as a Harvard College Observatory circular under Pickering’s name, with a note that the work had been prepared by Miss Leavitt. Within a year, Ejnar Hertzsprung used it to estimate the distance to the Small Magellanic Cloud. Harlow Shapley used Cepheids to map the size of the Milky Way. In 1923, Edwin Hubble found a Cepheid in the Andromeda nebula and showed that it lay far outside our galaxy, settling a long debate about whether other galaxies existed at all." },
      { type: "p", html: "Every one of those results depended on Leavitt’s relationship. Today it remains the first rung of the <a href=\"/articles/the-universe-is-expanding-at-two-speeds\">cosmic distance ladder</a> used to measure the expansion of the universe, and astronomers increasingly call it the Leavitt law." },
      { type: "h2", text: "Credit, late" },
      { type: "p", html: "Leavitt was often ill and partly deaf, and she was not encouraged to pursue the theoretical questions her discovery raised; Pickering preferred his computers to measure, not to interpret. She died of cancer in December 1921, at the age of 53. Four years later, the Swedish mathematician Gösta Mittag-Leffler wrote to Harvard to propose nominating her for a Nobel Prize, unaware that she had died. The prize is not awarded posthumously." },
      { type: "p", html: "Harvard’s plate collection, roughly half a million glass negatives of the sky, still exists, and a project to digitize it has made it available to a new generation of astronomers. The plates Leavitt worked from are in it, some still bearing the ink marks the computers made on the glass. It is a strange kind of monument: a ruler she built from glass, light and patience, which the rest of astronomy has been measuring with ever since." },
    ],
  },
  {
    slug: "the-night-sky-is-disappearing",
    title: "The night sky is disappearing, about ten percent a year",
    dek: "Light pollution is brightening the sky faster than satellite data suggested, and a growing fleet of satellites adds streaks of its own. What we lose when we cannot see the stars is not only astronomy.",
    seoDescription:
      "Citizen science shows the night sky brightening by nearly 10 percent a year. The costs of light pollution and satellite streaks, and what can be done.",
    section: "ideas",
    format: "Essay",
    author: "mara-okonkwo",
    publishedAt: "2026-07-22T08:00:00Z",
    cover: {
      image: "black-marble",
      alt: "The night side of Earth seen from space, with the cities of North America glowing as clusters of orange light against the dark globe.",
      caption: "The Americas at night, assembled from cloud-free satellite observations for NASA’s Black Marble project.",
    },
    tags: ["Light pollution", "Satellites", "Dark skies", "Observational astronomy"],
    body: [
      { type: "p", html: "In 2023, a team led by Christopher Kyba published an analysis of more than 50,000 observations submitted by members of the public to the Globe at Night project, which asks people to compare the stars they can see with a set of reference charts. Between 2011 and 2022, the visible sky lost stars quickly. The researchers estimated that the brightness of the night sky was increasing by nearly ten percent per year." },
      { type: "p", html: "At that rate, a child born where 250 stars are visible would be able to see fewer than 100 by their eighteenth birthday. Satellite measurements had suggested a slower increase, partly because many satellite sensors cannot detect the blue-rich light of modern white LEDs, which scatter strongly in the atmosphere." },
      { type: "h2", text: "A third of humanity" },
      { type: "p", html: "The Milky Way is already hidden from more than a third of humanity, according to the most recent world atlas of artificial sky brightness, including roughly 60 percent of Europeans and nearly 80 percent of North Americans. For most people who have ever lived, a sky crowded with stars was an ordinary feature of night. For most people alive now, it is something you travel to see." },
      { type: "quote", text: "For most people alive now, a sky crowded with stars is something you travel to see." },
      { type: "h2", text: "Streaks in the data" },
      { type: "p", html: "Professional observatories are built far from cities, but they face a newer problem. Thousands of communications satellites now circle the planet in low orbits, and tens of thousands more are planned. Sunlight glinting off them leaves bright streaks across long-exposure images. For wide-field survey telescopes such as the Vera C. Rubin Observatory, which images the whole southern sky every few nights, a significant fraction of exposures near twilight will contain at least one trail." },
      { type: "p", html: "Satellite operators have worked with astronomers on darker coatings and changes to how satellites are oriented, and the International Astronomical Union has set up a center to coordinate those efforts. Software can mask many streaks. But masking is a loss of data, and radio astronomers face interference that is harder to remove." },
      { type: "h2", text: "Not only astronomy" },
      { type: "p", html: "Artificial light at night affects much more than telescopes. Migrating birds are drawn off course by illuminated buildings. Insects are trapped circling streetlights, a contributing factor in their decline. Sea turtle hatchlings crawl toward bright roads instead of the ocean. Human sleep and hormone cycles respond to light, too." },
      { type: "p", html: "The encouraging part is that light pollution is unusually easy to reduce. Shielded fixtures that point light downward, warmer color temperatures, lower brightness and switching lights off when no one needs them all work immediately, and save energy. Dozens of communities have been certified as dark sky places for doing exactly that." },
      { type: "p", html: "It is worth asking what kind of loss this is. Astronomy will survive; it will move further away and spend more money. What is harder to replace is the ordinary experience of stepping outside and seeing the structure of the galaxy we live in. The night sky was the first scientific instrument, the place where people first noticed patterns, kept calendars and asked what the lights were. It would be a strange inheritance to lose it to lighting nobody needs." },
    ],
  },
];
