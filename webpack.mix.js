// 🎚️ Imports
const mix = require("laravel-mix");
const path = require("path");
const fse = require("fs-extra");
const klaw = require("klaw");
const through2 = require("through2");
const openmojiList = require("openmoji/data/openmoji.json");
const { getWordsList } = require("most-common-words-by-language");

/**
 * 🎚️ Base config
 */
const config = {
  // Folder served to users
  publicFolder: "dist",
  // Foldername for built src assets (publicFolder base)
  deployFolder: "../",
};

/**
 * 🎚️ Source folders
 */
const source = {
  icons: path.resolve("src/icons"),
  scripts: path.resolve("src/scripts"),
  styles: path.resolve("src/styles"),
};

/**
 * 💫 Before Mix
 */

let listOfEmojiFiles = [];
mix.before(() => {
  const animals = openmojiList.filter(
    (emoji) => emoji.group === "animals-nature"
  );
  const food = openmojiList.filter((emoji) => emoji.group === "food-drink");
  const objects = openmojiList.filter((emoji) => emoji.group === "objects");

  selectedEmojiGroups = [...animals, ...food, ...objects];
  const selectedEmojiHexes = selectedEmojiGroups.map((emoji) => emoji.hexcode);

  const excludeDirFilter = through2.obj(function (item, enc, next) {
    if (!item.stats.isDirectory()) {
      this.push(item);
    }
    next();
  });

  return new Promise((resolve) => {
    // Copy Openmoji SVGs
    klaw("node_modules/openmoji/color/")
      .pipe(excludeDirFilter)
      .on("data", (item) => {
        const basename = path.basename(item.path);
        if (selectedEmojiHexes.includes(path.basename(item.path, ".svg"))) {
          fse.copy(item.path, `dist/discordant-assets/icons/${basename}`);
          listOfEmojiFiles.push(`'${basename}'`);
        }
      })
      .on("end", () => {
        const file = "./src/styles/_emojis.scss";
        const sassListOfEmojis = `$emojis: ${listOfEmojiFiles.join(",")};`;
        fse.outputFile(file, sassListOfEmojis, (err) => {
          console.log(err);

          fse.readFile(file, "utf8", (err, data) => {
            if (err) return console.error(err);
          });
        });

        // Copy Fonts
        fse.copy("node_modules/@fontsource/", "dist/discordant-assets/fonts/");

        resolve();
      });
  });
});

/**
 * 🏢 HTML
 */
require("laravel-mix-nunjucks");
mix.njk("src/layouts/", config.publicFolder, {
  envOptions: { watch: true },
});

/**
 * 🍵 Scripts
 */
mix.js(`${source.scripts}/discordant.js`, config.publicFolder);

/**
 * 🗺 Source Maps
 */
if (!mix.inProduction()) {
  mix.sourceMaps();
}
/**
 * 🦜 Styles
 */
mix
  .sass(`${source.styles}/discordant.scss`, config.publicFolder, {
    additionalData: `
    $isDev: ${!mix.inProduction()};
    $comboChars: ${(function () {
      const sym = ["_"];
      const num = Array.from(Array(10).keys());
      const abc = String.fromCharCode(...Array(123).keys())
        .slice(97)
        .split("");
      const ABC = String.fromCharCode(...Array(91).keys())
        .slice(65)
        .split("");
      const words = getWordsList("english", 2000);
      const firstTwoChars = words
        .filter((word) => word.length >= 2)
        .map((word) => word.slice(0, 2));
      const dedupedTwoChars = new Set(firstTwoChars);
      const dedupedTwoCharsSafe = Array.from(dedupedTwoChars).map(
        (chars) => `"${chars}"`
      );
      const dedupedTwoCharsUpperSafe = Array.from(dedupedTwoChars).map(
        (chars) => `"${chars.slice(0, 1).toUpperCase() + chars.slice(1, 2)}"`
      );

      console.table([...dedupedTwoCharsSafe, ...dedupedTwoCharsUpperSafe]);

      const comboChars = [
        ...sym,
        ...num,
        ...abc,
        ...ABC,
        ...dedupedTwoCharsSafe,
        ...dedupedTwoCharsUpperSafe,
      ];

      return comboChars;
    })()};
    `,
  })
  .options({
    processCssUrls: false,
  });

/**
 * 🕸 Local Web Server
 */
mix.browserSync({
  server: {
    baseDir: config.publicFolder,
  },
});
