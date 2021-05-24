// 🎚️ Imports
const mix = require("laravel-mix");
const path = require("path");
const fse = require("fs-extra");
const klaw = require("klaw");
const through2 = require("through2");
const openmojiList = require("openmoji/data/openmoji.json");

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

mix.before(() => {
  let listOfEmojiFiles = [];
  const animals = openmojiList.filter(
    (emoji) => emoji.group === "animals-nature"
  );
  const food = openmojiList.filter((emoji) => emoji.group === "food-drink");

  selectedEmojiGroups = [...animals, ...food];
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
mix.sourceMaps();

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

      const comboChars = [];

      for (let letter = 0; letter < abc.length; letter += 1) {
        comboChars.push(abc[letter]);
        comboChars.push(ABC[letter]);
        comboChars.push(abc[letter] + abc[letter]);
        comboChars.push(ABC[letter] + abc[letter]);
        comboChars.push(ABC[letter] + ABC[letter]);

        // Offsets
        if (ABC[letter + 1]) {
          comboChars.push(abc[letter] + ABC[letter + 1]);
          comboChars.push(ABC[letter] + abc[letter + 1]);
          comboChars.push(ABC[letter] + ABC[letter + 1]);
        }

        if (abc[letter + 2]) {
          comboChars.push(abc[letter] + abc[letter + 2]);
          comboChars.push(ABC[letter] + ABC[letter + 2]);
        }
      }

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
