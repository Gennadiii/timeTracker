const fs = require('fs');
const os = require('os');
const ioHook = require('iohook');
const say = require('say')


const fileIdentifier = `timeTracker`;
const currentSequence = Array(3);
const SECOND = 1000;
const MINUTE = SECOND * 60;
const HOUR = MINUTE * 60;
const dayTime = 8 * HOUR;
const weakTime = 5 * dayTime;
const writeFileTimout = HOUR / 2;
const day = {
  5: `понедельник`,
  4: `вторник`,
  3: `среду`,
  2: `четверг`,
}
let working = true;
let timer = 0;
let startTime = null;
let initialTimestamp = null;
let currentTime = null;
let currentDay = null;

void async function main() {
  if (!isTrackFileExists()) {
    fs.writeFileSync(`${getFile().pathToFile}/${toDate(weakTime)}${fileIdentifier}`);
  }
  await startWorking();
}();

ioHook.on('keydown', async event => {
  const startSequence = '295631'; // ctrl alt s
  const endSequence = '295616'; // ctrl alt q
  currentSequence.push(event.keycode);
  currentSequence.shift();
  if (currentSequence.join('') === endSequence) {
    stopWorking();
  }
  if (currentSequence.join('') === startSequence) {
    await startWorking();
  }
});
ioHook.start();

async function startWorking({shouldLog = true} = {}) {
  shouldLog && logEvent('Начинай работать');
  let writeTimeToFileCounter = 0;
  initialTimestamp = toTimestamp(getFile().initialTime);
  working = true;
  startTime = Date.now();
  timer = 0;
  while (working) {
    await sleep(SECOND); // this kills 2 ssd units in a year for my laptop
    timer = Date.now() - startTime;
    currentTime = initialTimestamp - timer;
    if (!currentDay) {
      currentDay = Math.floor(currentTime / dayTime) + 1;
    }
    console.info(toDate(currentTime));
    if (currentTime < 0) {
      logEvent('Ты отработал эту неделю. Начинаешь следующую.');
      writeTimeToFile(weakTime);
      return startWorking({shouldLog: false});
    }
    if ((currentTime / dayTime) < currentDay - 1) {
      logEvent(`На ${day[currentDay]} фатит`);
      currentDay -= 1;
    }
    if (Math.floor(timer / writeFileTimout) === writeTimeToFileCounter) {
      writeTimeToFile(currentTime);
      writeTimeToFileCounter++;
    }
  }
}

function isTrackFileExists() {
  return Boolean(getFile().name);
}

function stopWorking() {
  logEvent('Заканчивай работать');
  working = false;
  writeTimeToFile(currentTime);
}

function logEvent(message) {
  console.log(message);
  say.speak(message);
}

function getFile() {
  const homeDir = `${os.homedir()}/Desktop`;
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
  fs.writeFileSync(newPath, new Date());
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
