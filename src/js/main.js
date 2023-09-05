// load elements
const wrapper = document.querySelector(".at-wrap");
const main = wrapper.querySelector(".at-main");
const urlParams = new URLSearchParams(window.location.search);
const urlFileName = urlParams.get("filename");

// initialize alphatab
const settings = {
  file: urlFileName ?? "/file.xml",
  player: {
    enablePlayer: true,
    enableCursor: true,
    enableUserInteraction: true,
    soundFont: "/dist/soundfont/sonivox.sf2",
    scrollElement: wrapper.querySelector(".at-viewport"),
  },
};
let api = new alphaTab.AlphaTabApi(main, settings);
let currentTimeSignatureType = -1;
api.masterVolume = 0;

const inputElement = document.getElementById("input-file");
if (urlFileName) {
  document.getElementById("custom-input-file").style.display = "none";
}
inputElement.addEventListener("change", onUploadedFile, false);
function onUploadedFile() {
  const file = this.files[0];
  let reader = new FileReader();
  reader.onload = function (e) {
    let arrayBuffer = new Uint8Array(reader.result);
    api.load(arrayBuffer);
  };
  reader.readAsArrayBuffer(file);
}

function getStartTimeSignatureType() {
  let timeSignatureType = getTimeSignatureType(
    api.score.masterBars[0].timeSignatureNumerator,
    api.score.masterBars[0].timeSignatureDenominator
  );
  if (currentTimeSignatureType == timeSignatureType) return;
  currentTimeSignatureType = timeSignatureType;
}

function getTimeSignatureType(numerator, denominator) {
  /*
    1. 2/4: Two quarter-note beats per measure.
    2. 3/4: Three quarter-note beats per measure.
    3. 4/4: Four quarter-note beats per measure. Also known as common time and notated with a “C.”
    4. 2/2: Two half-note beats per measure. Also known as cut time is notated as a “C” with a vertical slash through it.
    5. 6/8: Six eighth-note beats per measure
    6. 9/8: Nine eighth-note beats per measure
    7. 12/8: Twelve eighth-note beats per measure
  */
  if (numerator == 2 && denominator == 4) {
    return 1;
  } else if (numerator == 3 && denominator == 4) {
    return 2;
  } else if (numerator == 4 && denominator == 4) {
    return 3;
  } else if (numerator == 2 && denominator == 2) {
    return 4;
  } else if (numerator == 6 && denominator == 8) {
    return 5;
  } else if (numerator == 9 && denominator == 8) {
    return 6;
  } else if (numerator == 12 && denominator == 8) {
    return 7;
  }
  return -1;
}

// overlay logic
const overlay = wrapper.querySelector(".at-overlay");
api.renderStarted.on(() => {
  overlay.style.display = "flex";
});
api.renderFinished.on(() => {
  overlay.style.display = "none";
});

// track selector
function createTrackItem(track) {
  const trackItem = document
    .querySelector("#at-track-template")
    .content.cloneNode(true).firstElementChild;
  trackItem.querySelector(".at-track-name").innerText = track.name;
  trackItem.track = track;
  trackItem.onclick = (e) => {
    e.stopPropagation();
    api.renderTracks([track]);
  };
  return trackItem;
}

const trackList = wrapper.querySelector(".at-track-list");
api.scoreLoaded.on((score) => {
  // clear items
  trackList.innerHTML = "";
  // generate a track item for all tracks of the score
  score.tracks.forEach((track) => {
    trackList.appendChild(createTrackItem(track));
  });
});
api.renderStarted.on(() => {
  // collect tracks being rendered
  const tracks = new Map();
  api.tracks.forEach((t) => {
    tracks.set(t.index, t);
  });
  // mark the item as active or not
  const trackItems = trackList.querySelectorAll(".at-track");
  trackItems.forEach((trackItem) => {
    if (tracks.has(trackItem.track.index)) {
      trackItem.classList.add("active");
    } else {
      trackItem.classList.remove("active");
    }
  });
});

/** Controls **/
api.scoreLoaded.on((score) => {
  wrapper.querySelector(".at-song-title").innerText = score.title;
  wrapper.querySelector(".at-song-artist").innerText = score.artist;

  getStartTimeSignatureType();
});

wrapper.querySelector(".at-controls .at-print").onclick = () => {
  api.print();
};

const zoom = wrapper.querySelector(".at-controls .at-zoom select");
zoom.onchange = () => {
  const zoomLevel = parseInt(zoom.value) / 100;
  api.settings.display.scale = zoomLevel;
  api.updateSettings();
  api.render();
};

const layout = wrapper.querySelector(".at-controls .at-layout select");
layout.onchange = () => {
  switch (layout.value) {
    case "horizontal":
      api.settings.display.layoutMode = alphaTab.LayoutMode.Horizontal;
      break;
    case "page":
      api.settings.display.layoutMode = alphaTab.LayoutMode.Page;
      break;
  }
  api.updateSettings();
  api.render();
};

// player loading indicator
const playerIndicator = wrapper.querySelector(
  ".at-controls .at-player-progress"
);
api.soundFontLoad.on((e) => {
  const percentage = Math.floor((e.loaded / e.total) * 100);
  playerIndicator.innerText = percentage + "%";
});
api.playerReady.on(() => {
  playerIndicator.style.display = "none";
});

// main player controls
const playPause = wrapper.querySelector(".at-controls .at-player-play-pause");
const stop = wrapper.querySelector(".at-controls .at-player-stop");
playPause.onclick = (e) => {
  if (e.target.classList.contains("disabled")) {
    return;
  }
  if (e.target.classList.contains("fa-play")) {
    console.log("The time signature is: " + currentTimeSignatureType);
    setTimeout(function () {
      api.playPause();
    }, 500);
  } else if (e.target.classList.contains("fa-pause")) {
    api.playPause();
  }
};
stop.onclick = (e) => {
  if (e.target.classList.contains("disabled")) {
    return;
  }
  api.stop();
  getStartTimeSignatureType();
};
api.playerReady.on(() => {
  playPause.classList.remove("disabled");
  stop.classList.remove("disabled");
});
api.playerStateChanged.on((e) => {
  const icon = playPause.querySelector("i.fas");
  if (e.state === alphaTab.synth.PlayerState.Playing) {
    icon.classList.remove("fa-play");
    icon.classList.add("fa-pause");
  } else {
    icon.classList.remove("fa-pause");
    icon.classList.add("fa-play");
  }
});

// song position
function formatDuration(milliseconds) {
  let seconds = milliseconds / 1000;
  const minutes = (seconds / 60) | 0;
  seconds = (seconds - minutes * 60) | 0;
  return (
    String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0")
  );
}

const songPosition = wrapper.querySelector(".at-song-position");
let previousTime = -1;
api.playerPositionChanged.on((e) => {
  // reduce number of UI updates to second changes.
  const currentSeconds = (e.currentTime / 1000) | 0;
  if (currentSeconds == previousTime) {
    return;
  }

  songPosition.innerText =
    formatDuration(e.currentTime) + " / " + formatDuration(e.endTime);
});

const beatDescription = wrapper.querySelector(".at-beat-description");
api.activeBeatsChanged.on((args) => {
  let notes = [];
  beatDescription.innerText = "";
  for (let index = 0; index < args.activeBeats.length; index++) {
    const duration = args.activeBeats[index].duration;
    const noteValues = Array.from(
      args.activeBeats[index].noteValueLookup.keys()
    );
    let i = 0;
    for (i = 0; i < noteValues.length; i++) {
      notes.push({
        midiValue: noteValues[i],
        duration: args.activeBeats[index].duration,
      });
      beatDescription.innerText +=
        " Note: " + noteValues[i] + " - Duration: " + duration;

      if (i != noteValues.length - 1) beatDescription.innerText += " |";
    }
    if (i != noteValues.length - 1 && index != args.activeBeats.length - 1)
      beatDescription.innerText += " |";
  }

  if (args.activeBeats[0] == undefined) return;
  if (args.activeBeats[0].previousBeat == undefined) return;
  const currBarId = args.activeBeats[0].voice.bar.index;
  const nextBarId = args.activeBeats[0].nextBeat.voice.bar.index;
  if (currBarId == nextBarId) return; //It is not the last note of the bar
  if (currBarId == undefined) return;
  const masterBar = api.score.masterBars.find((el) => el.index == currBarId);
  if (masterBar == undefined || masterBar.nextMasterBar == undefined) return;
  let timeSignatureType = getTimeSignatureType(
    masterBar.nextMasterBar.timeSignatureNumerator,
    masterBar.nextMasterBar.timeSignatureDenominator
  );
  if (currentTimeSignatureType == timeSignatureType) return;
  currentTimeSignatureType = timeSignatureType;
  console.log("The new time signature is: " + timeSignatureType);
});
