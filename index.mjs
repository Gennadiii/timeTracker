import fs from "fs";
import os from "os";
// const ioHook = require('iohook');
import say from "say";
import readline from "readline";

readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

const fileIdentifier = `timeTracker`;
const currentSequence = Array(3);
const SECOND = 1000;
const MINUTE = SECOND * 60;
const HOUR = MINUTE * 60;
const dayTime = 8 * HOUR;
const weakTime = 5 * dayTime;
const writeFileTimout = HOUR / 2;
const day = {
  5: `Monday`,
  4: `Tuesday`,
  3: `Wednesday`,
  2: `Thursday`,
}
const phrases = {
  startWorking: 'start working',
  stopWorking: 'stop working',
  weekEnded: 'you have finished this week. Starting the next one',
  dayEnded: day => `It's enough for ${day}`,
};
let working = true;
let timer = 0;
let startTime = null;
let initialTimestamp = null;
let currentTime = null;
let currentDay = null;
let isListening = false;
let isSubtractionMode = false;
let subtractionArr = [];

void async function main() {
  if (!isTrackFileExists()) {
    fs.writeFileSync(`${getFile().pathToFile}/${toDate(weakTime)}${fileIdentifier}`, '');
  }
  await startWorking();
}();

process.stdin.on('keypress', async (str, key) => {
  const keys = {
    startListening: key?.meta && key?.name === 'z',
    startWorking: !key.meta && key.name === 's',
    stopWorking: !key.meta && key.name === 'q',
    enterSubtractionMode: !key.meta && str === '-',
    exitSubtractionMode: str === '\r',
  }
  if (keys.startListening) {
    isListening = true;
  }
  if (!isListening) {
    return;
  }
  if (keys.startWorking) {
    isListening = false;
    await startWorking();
  }
  if (keys.stopWorking) {
    isListening = false;
    stopWorking();
  }
  if (keys.enterSubtractionMode) {
    isSubtractionMode = true;
  }
  if (isSubtractionMode) {
    str && !keys.exitSubtractionMode && subtractionArr.push(str);
  }
  if (keys.exitSubtractionMode) {
    isSubtractionMode = false;
    isListening = false;
    stopWorking({shouldLog: false});
    adjustTime();
    await sleep(2000);
    await startWorking({shouldLog: false});
  }
});


// ioHook.on('keydown', async event => {
//   const startSequence = '295631'; // ctrl alt s
//   const endSequence = '295616'; // ctrl alt q
//   currentSequence.push(event.keycode);
//   currentSequence.shift();
//   if (currentSequence.join('') === endSequence) {
//     stopWorking();
//   }
//   if (currentSequence.join('') === startSequence) {
//     await startWorking();
//   }
// });
// ioHook.start();

function adjustTime() {
  try {
    if (subtractionArr[0] === '-' && subtractionArr[1] === '-') {
      subtractionArr = subtractionArr.slice(2);
    }
    const chosenTime = subtractionArr.join('');
    subtractionArr = [];
    const timeToAdd = Number(chosenTime) * HOUR;
    if (isNaN(timeToAdd)) {
      throw new Error(`wrong time inserted: ${chosenTime}`);
    }
    const currentTime = getFile().initialTime;
    const newTime = toTimestamp(currentTime) + timeToAdd;
    logEvent(`Adding ${chosenTime} hours`);
    writeTimeToFile(newTime);
  } catch (err) {
    logEvent(`Failed to adjust time`);
    console.log(`-`.repeat(30));
    console.log(err);
    console.log(`-`.repeat(30));
  }
}

async function startWorking({shouldLog = true} = {}) {
  shouldLog && logEvent(phrases.startWorking);
  let writeTimeToFileCounter = 0;
  initialTimestamp = toTimestamp(getFile().initialTime);
  working = true;
  startTime = Date.now();
  timer = 0;
  while (working) {
    await sleep(SECOND);
    timer = Date.now() - startTime;
    currentTime = initialTimestamp - timer;
    if (!currentDay) {
      currentDay = Math.floor(currentTime / dayTime) + 1;
    }
    const leftToWorkToday = currentTime % dayTime;
    console.info(`${toDate(currentTime)} - ${toDate(leftToWorkToday)} - ${toDate(getCurrentTime() + leftToWorkToday)}`);
    if (currentTime < 0) {
      logEvent(phrases.weekEnded);
      writeTimeToFile(weakTime);
      return startWorking({shouldLog: false});
    }
    if ((currentTime / dayTime) < currentDay - 1) {
      logEvent(phrases.dayEnded(day[currentDay]));
      currentDay -= 1;
    }
    if (Math.floor(timer / writeFileTimout) === writeTimeToFileCounter) {
      writeTimeToFile(currentTime); // this kills 2 ssd units in a year for my laptop
      writeTimeToFileCounter++;
    }
  }
}

function isTrackFileExists() {
  return Boolean(getFile().name);
}

function stopWorking({shouldLog = true} = {}) {
  shouldLog && logEvent(phrases.stopWorking);
  working = false;
  writeTimeToFile(currentTime);
}

function logEvent(message) {
  console.log(message);
  say.speak(message);
}

function getFile() {
  const homeDir = `${os.homedir()}/OneDrive/Рабочий стол`;
  const allFiles = fs.readdirSync(homeDir);
  return {
    pathToFile: homeDir,
    get name() {
      return allFiles.find(file => file.includes(fileIdentifier));
    },
    get fullPath() {
      return `${homeDir}/${this.name}`;
    },
    get initialTime() {
      return this.name.replace(fileIdentifier, '').replace('---', '').replace('+++', '');
    }
  };
}

function writeTimeToFile(time) {
  const workingIdentifier = working ? '+++' : '---';
  const newPath = `${getFile().pathToFile}/${toDate(time)}${workingIdentifier}${fileIdentifier}`;
  fs.renameSync(getFile().fullPath, newPath);
  fs.writeFileSync(newPath, String(new Date()));
}

function toDate(time) {
  const hours = Math.floor(time / HOUR);
  time -= hours * HOUR;
  const minutes = Math.floor(time / MINUTE);
  time -= minutes * MINUTE;
  const seconds = Math.floor(time / SECOND);
  return `${hours}_${minutes.toString().padStart(2, '0')}_${seconds.toString().padStart(2, '0')}`;
}

function toTimestamp(date) {
  const timeArr = date.split('_');
  return timeArr[0] * HOUR + timeArr[1] * MINUTE + timeArr[2] * SECOND;
}

function sleep(timeout) {
  return new Promise(resolve => setTimeout(resolve, timeout));
}

function getCurrentTime() {
  const date = new Date();
  return date.getHours() * HOUR + date.getMinutes() * MINUTE + date.getSeconds() * SECOND;
}
