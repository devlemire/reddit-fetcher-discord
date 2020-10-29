require("dotenv").config({ path: `${__dirname}/.env` });
const Discord = require("discord.js");
const axios = require("axios");
const TARGETS = require("./targets.json");
const MESSAGES = require("./messages.json");

// Use an object for instant lookup
const alreadySent = {};

const generateLatestUrl = (subreddit, count = 1) =>
  `https://www.reddit.com/r/${subreddit}/top/.json?count=${count}`;

const generateHotUrl = (subreddit, count = 1) =>
  `https://www.reddit.com/r/${subreddit}/hot/.json?count=${count}`;

// env variables
const {
  NODE_ENV,
  SERVER_PORT,
  DISCORD_TOKEN,
  BOT_ON,
  channelName,
} = process.env;

// Discord Bot
const bot = new Discord.Client();

bot.on("ready", async (e) => {
  console.log("BOT READY");
  const botEnabled = BOT_ON === "true";
  // 30 minutes
  const timeToWaitInMs = 1000 * 60 * 30;

  // The channel to send the images to
  const channel = bot.channels.find((channelObj) => {
    return channelObj.name === channelName;
  });

  // Message generator
  const randomMessage = () => {
    return MESSAGES[Math.floor(Math.random() * Math.floor(MESSAGES.length))];
  };

  // Loop through the target subreddits and grab the most recent top post
  // Take the top post and post the image link to the target channel
  const loopThroughTargets = async () => {
    console.log("FETCHING TARGETS");
    let atLeastOnePicSent = false;

    for (let i = 0; i < TARGETS.length; i++) {
      const subreddit = TARGETS[i];
      const {
        data: {
          data: { children: hotChildren },
        },
      } = await axios.get(generateHotUrl(subreddit));

      let hotFirstChild = (hotChildren[0] && hotChildren[0].data) ? hotChildren[0].data : {};

      if (hotFirstChild.stickied) {
        if (hotChildren[1] && hotChildren[1].data) {
          hotFirstChild = hotChildren[1].data
        } else {
          continue
        }
      }

      const hotImageUrl = hotFirstChild.url;
      const permalink = hotFirstChild.permalink;

      if (hotImageUrl && !alreadySent[hotImageUrl]) {
        channel.send(`https://reddit.com${permalink} ${hotImageUrl}`);
        alreadySent[hotImageUrl] = true;
        atLeastOnePicSent = true;
      }
    }

    if (atLeastOnePicSent) {
      channel.send(randomMessage());
    }
  };

  // Only run this if the bot is enabled
  if (botEnabled) {
    await loopThroughTargets();
    setInterval(loopThroughTargets, timeToWaitInMs);
  }

  const { username, id } = bot.user;
  console.log(`Logged in as: ${username} - ${id}`);
  console.log("****** (safe) process.env variables ******");
  console.log("NODE_ENV:", NODE_ENV);
  console.log("SERVER_PORT:", SERVER_PORT);
  console.log("****** process.env variables ******");
});

bot.on("disconnect", (e) => {
  console.log("Bot disconnected:", e);
});

async function login() {
  try {
    await bot.login(DISCORD_TOKEN);
  } catch (err) {
    console.error("The bot failed to login:", err);
  }
}

login();

module.exports = bot;
