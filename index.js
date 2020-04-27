const fs = require('fs');
const os = require('os');
const ioHook = require('iohook');
const say = require('say')


const fileIdentifier = `---timeTracker`;
const currentSequence = Array(3);
const SECOND = 1000;
const MINUTE = SECOND * 60;
const HOUR = MINUTE * 60;
const weakTime = 40 * HOUR;
const writeFileTimout = HOUR / 2;
let working = true;
let timer = 0;
let startTime = null;
let initialTimestamp = null;
let currentTime = null;

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
  shouldLog && logEvent('STARTING WORK');
  let writeTimeToFileCounter = 0;
  initialTimestamp = toTimestamp(getFile().initialTime);
  working = true;
  startTime = Date.now();
  timer = 0;
  while (working) {
    await sleep(SECOND); // this kills 2 ssd units in a year for my laptop
    timer = Date.now() - startTime;
    currentTime = initialTimestamp - timer;
    console.info(toDate(currentTime));
    if (currentTime < 0) {
      logEvent('You have finished this weak work. Starting next weak.');
      writeTimeToFile(weakTime);
      return startWorking({shouldLog: false});
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
  logEvent('STOPPING WORK');
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
      return this.name.replace(fileIdentifier, '');
    }
  };
}

function writeTimeToFile(time) {
  const newPath = `${getFile().pathToFile}/${toDate(time)}${fileIdentifier}`;
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
