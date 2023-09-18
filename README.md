# Notes Sound Generator

## Introduction

Blind people are unable to concurrently "read and play" the score but they have incredible tactile and auditory abilities, this project focuses on playing the time beats and the notes on mobile devices using the vibration functionality.

`Notes Sound Generator` is a [MuseScore 3.x](https://musescore.org) plugin for blind people; it is capable of reading the current score (which can be edited with [MuseScore](https://musescore.org) itself) and extracting, at playing time, the notes and the time signature of the score.

My solution uses the MuseScore plugin development stack, the [Alphatab](https://alphatab.net/) JS library to extract the notes and the time signature from a score, and the JavaScript [WebSocket](https://it.javascript.info/websocket) protocol to send data to mobile devices.

The score is a MusicXML file generated from the developed [MuseScore](https://musescore.org) plugin; this plugin executes the job of exporting the current score (eventually edited with the program itself) in MusicXML format and then passing it to a webpage where an instance of [Alphatab](https://alphatab.net/) is executed. The webpage is able, exploiting the low-level APIs of the library, to play the score and vibrate on mobile devices the time beats and the currently played notes.

## Implementation details

In the implementation, the `playing of the time beats` is communicated by descriptive text, points and a smartwatch vibration; text and points are colored in red for the first beat of a bar, and in green for the other beats.

<img src="assets/beat-description.png" alt="Beat description" style="max-height: 120px;">
<img src="assets/beat-point-red.png" alt="Beat description" style="max-width: 60px;">
<img src="assets/beat-point-green.png" alt="Beat description" style="max-width: 60px;">

The `current played notes` are communicated by descriptive text which indicates the [MIDI note number](https://www.inspiredacoustics.com/en/MIDI_note_numbers_and_center_frequencies) and the duration.

<img src="assets/note-description.png" alt="Beat description" style="max-height: 120px;">

### MuseScore plugin side

A `partial` portion of the `plugin` code is shown below; it emphasizes its behavior.

When the plugin is run, it `saves` the current `score` in a MusicXML file named `'new-exported.xml'` in the `same folder` of the [AlphaTab](https://github.com/CoderLine/alphaTab) instance, and then opens a new `web browser page` with the URL of the [AlphaTab](https://github.com/CoderLine/alphaTab) instance by specifying the parameter `filename`.

```js
function openGenerator(filePath, filename) {
  var newFilePath = filePath + "/src/" + filename;
  if (!writeScore(curScore, newFilePath, "xml")) {
    alert.text = "Cannot export the current score, try again.";
    alert.open();
    return;
  }
  Qt.openUrlExternally("http://localhost:8000?filename=" + filename);
  Qt.quit();
}

onRun: {
  var filename = "new-exported.xml";
  openGenerator(filePath, filename);
}
```

### Webpage side

#### Library initialization

The library is initialized by setting the `master volume` to zero in order to avoid the sound playing of the score, and the `file` parameter is set to the URL param of the page if it is specified. This parameter will be set from the [MuseScore](https://musescore.org) plugin with the filename of the file exported from itself.
Two WebSockets are opened in order to send the beat and notes infos to the mobile devices.

```js
var timeWebSocket = new WebSocket("ws://localhost:8080/time");
var notesWebSocket = new WebSocket("ws://localhost:8080/notes");
const urlParams = new URLSearchParams(window.location.search);
const urlFileName = urlParams.get("filename");
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
api.masterVolume = 0;
```

#### The `scoreLoaded` event

This event is fired every time a score is loaded. When it's fired, the `createMetronome` function is called which is responsible for building the `timeSignaturePauses` array that is used to play the time signature `beats`.

```js
api.scoreLoaded.on((score) => {
  trackList.innerHTML = "";
  score.tracks.forEach((track) => {
    trackList.appendChild(createTrackItem(track));
  });
  createMetronome(score);
});
```

#### The `createMetronome` function

This function creates the `timeSignaturePauses` array which is used to play the time signature `beats`. It iterates over the score's bars and calculates the `wait time after a beat` is played, by using the `tempoAutomation` value of a bar. The function also determines if the beat is the first beat in the bar.

```js
function createMetronome(score) {
  let tempoAutomation = 0;
  score.masterBars.forEach((bar) => {
    if (
      bar.tempoAutomation != null &&
      tempoAutomation != bar.tempoAutomation.value
    ) {
      tempoAutomation = bar.tempoAutomation.value;
    }
    let barDuration =
      parseFloat(60 / parseInt(tempoAutomation)) *
      parseInt(bar.timeSignatureNumerator);
    if (parseInt(bar.timeSignatureNumerator) == 0) return;
    let beatsWaitTime = barDuration / parseInt(bar.timeSignatureNumerator);
    for (
      let index = 1;
      index <= parseInt(bar.timeSignatureNumerator);
      index++
    ) {
      if (index == 1) {
        timeSignaturePauses.push({
          waitTime: beatsWaitTime,
          isFirstBeat: true,
        });
      } else {
        timeSignaturePauses.push({
          waitTime: beatsWaitTime,
          isFirstBeat: false,
        });
      }
    }
  });
}
```

#### The `play/pause` event

This event is fired every time the user clicks on the `play` or `pause` buttons.

When the `play` is fired, a new `metronomeWorker` [Web Worker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers) is started which is responsible for sending the `beat` to be played and waiting for the `pause` time indicated in the `timeSignaturePauses` array. The playing of a beat is fired through the `metronomeWorker.onmessage` callback and the `timeSignaturePauses` array is sent to the [Web Worker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers) via the `metronomeWorker.postMessage` function. When the playing of a beat is fired, a message via the WebSocket is sent to the mobile devices.

When the `pause` is fired, the previously `metronomeWorker` [Web Worker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers) started, is terminated.

```js
playPause.onclick = (e) => {
  if (e.target.classList.contains("disabled")) {
    return;
  }
  if (e.target.classList.contains("fa-play")) {
    let currentBarIndex = getCurrentBarIndex(api.tickPosition);
    api.tickPosition = api.score.masterBars[currentBarIndex].start;
    metronomeWorker = new Worker("/js/metronomeWorker.js");
    beatLogger.innerHTML = "";
    metronomeWorker.postMessage({
      startIndex: currentBarIndex,
      pauses: timeSignaturePauses,
    });
    metronomeWorker.onmessage = function (message) {
      if (timeWebSocket.readyState != 1) return;
      if (message.data.isFirstBeat) {
        beatLogger.innerHTML = '<p style="color: green;">BEAT</p>';
        highlightBeat("green");
      } else {
        beatLogger.innerHTML += '<p style="color: red;">BEAT</p>';
        highlightBeat("red");
      }
      timeWebSocket.send(
        JSON.stringify({ isFirstBeat: message.data.isFirstBeat })
      );
      beatLogger.scrollTo(0, beatLogger.scrollHeight);
    };
    api.playPause();
  } else if (e.target.classList.contains("fa-pause")) {
    api.playPause();
    noteLogger.innerHTML = "";
    beatLogger.innerHTML = "";
    metronomeWorker.terminate();
  }
};
```

#### The `metronomeWorker` [Web Worker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers)

Every time that the worker is launched, it iterates over the `timeSignaturePauses` array by sending the `beat` message and then waiting for the `waitTime` specified in the current element, until the array is entirely consumer or the [Web Worker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers) is terminated.

```js
{
  function sleep(delay) {
    var start = new Date().getTime();
    while (new Date().getTime() < start + delay);
  }

  self.onmessage = function (message) {
    let timeSignaturePauses = message.data.pauses;
    let startIndex = message.data.startIndex;
    for (let index = startIndex; index < timeSignaturePauses.length; index++) {
      const element = timeSignaturePauses[index];
      self.postMessage(element);
      sleep(element.waitTime * 1000);
    }
  };
}
```

#### The `activeBeatsChanged` event

This event is fired every time a note (or a group of notes) in the score is played. When it's fired, a message via the WebSocket is sent to the mobile devices, and the DOM element `noteLogger` content is replaced with the description of the current notes played; the notes are extracted from the `activeBeats` variable in the `args` parameter.

```js
const noteLogger = document.getElementById("note-logger");
api.activeBeatsChanged.on((args) => {
  noteLogger.innerHTML = "";
  for (let index = 0; index < args.activeBeats.length; index++) {
    const duration = args.activeBeats[index].duration;
    const noteValues = Array.from(
      args.activeBeats[index].noteValueLookup.keys()
    );
    let i = 0;
    for (i = 0; i < noteValues.length; i++) {
      noteLogger.innerHTML +=
        '<p style="text-align: center;">Note ' +
        noteValues[i] +
        " (" +
        duration +
        ")</p>";
    }
    noteLogger.scrollTo(0, noteLogger.scrollHeight);
  }
  if (notesWebSocket.readyState != 1) return;
  notesWebSocket.send(JSON.stringify({ data: noteLogger.innerHTML }));
});
```

### WebSocket side

#### The `onOpen` function

Every time a `new client` opens the connection to the WebSocket, the server attaches the connection to the respective clients' `array` identified by the connection `path` specified.

```php
public function onOpen(ConnectionInterface $conn)
{
    $request = $conn->httpRequest;
    if ($request->getUri()->getPath() === '/time') {
        $this->timeClients->attach($conn);
        echo "New connection to time channel: {$conn->resourceId}\n";
    }
    if ($request->getUri()->getPath() === '/notes') {
        $this->notesClients->attach($conn);
        echo "New connection to notes channel: {$conn->resourceId}\n";
    }
}
```

#### The `onMessage` function

Every time a `client` sends a message to the WebSocket server, it broadcasts the message to the other clients connected to the same channel identified by the connection `path` specified.

```php
public function onMessage(ConnectionInterface $from, $msg)
{
    $request = $from->httpRequest;
    if ($request->getUri()->getPath() === '/time') {
        foreach ($this->timeClients as $client) {
            if ($from !== $client) {
                $client->send($msg);
            }
        }
    }
    if ($request->getUri()->getPath() === '/notes') {
        foreach ($this->notesClients as $client) {
            if ($from !== $client) {
                $client->send($msg);
            }
        }
    }
}
```

### Mobile App side

#### The connections to WebSocket

On app `startup`, the WebSocket connections are created.

```dart
final timeChannel = IOWebSocketChannel.connect('ws://YOUR_LOCAL_MACHINE_IP:8080/time');
final notesChannel = IOWebSocketChannel.connect('ws://YOUR_LOCAL_MACHINE_IP:8080/notes');
```

#### The timeChannel StreamBuilder

In the `build` method of the main widget, a new `StreamBuilder` is created for the `timeChannel` connection; the `StreamBuilder` widget executes the `builder` function instructions when receiving a `new message` on the WebSocket.

It vibrates the mobile device and prints on the screen the beats, using a `ListView` starting from the `beats` elements `List`, which is emptied when the first beat of the bar has been received.

```dart
StreamBuilder(
  stream: timeChannel.stream,
  builder: (context, snapshot) {
    if (!snapshot.hasData) {
      return const Center(child: CircularProgressIndicator());
    }
    final message = jsonDecode(snapshot.data);
    Vibration.vibrate();
    if (message["isFirstBeat"]) beats = [];
    beats.add(message["isFirstBeat"]);
    return Expanded(
      flex: 1,
      child: Align(
        alignment: Alignment.center,
        child: ListView.builder(
          scrollDirection: Axis.horizontal,
          itemBuilder: (context, index) {
            return Center(
              child: Icon(
                Icons.circle,
                size: 30,
                color: beats[index] ? Colors.green : Colors.red,
              ),
            );
          },
          itemCount: beats.length,
        ),
      ),
    );
  },
)
```

#### The notesChannel StreamBuilder

In the `build` method of the main widget, a new `StreamBuilder` is created for the `notesChannel` connection; the `StreamBuilder` widget executes the `builder` function instructions when receiving a `new message` on the WebSocket.

It prints on the screen the notes contained in the WebSocket message.

```dart
StreamBuilder(
  stream: notesChannel.stream,
  builder: (context, snapshot) {
    if (!snapshot.hasData) {
      return const Center(child: CircularProgressIndicator());
    }
    final message = jsonDecode(snapshot.data);
    return Expanded(
      flex: 5,
      child: Html(data: message["data"]),
    );
  },
)
```

## Execution Tutorial

This tutorial shows how to locally deploy and run the project.

- **[Prerequisites](#prerequisites)**
- **[Repository](#repository)**
- **[Build](#build)**
- **[Run on MacOS](#run-on-macos)**
- **[Run on other platforms](#run-on-other-platforms)**

### Prerequisites

- [MuseScore 3](https://musescore.org/download#older-versions)
- [Docker and Docker Compose](https://www.docker.com) (Application containers engine)
- [Flutter Framework SDK](https://docs.flutter.dev/get-started/install)
- The ports `8000` and `8080` free on your local machine

### Repository

Clone the repository into the `Plugins` folder of [MuseScore 3](https://musescore.org):

```sh
$ cd PathToYourMuseScore3Folder/Plugins
$ git clone https://github.com/IvanBuccella/notes-sound-generator
```

### Build

- Build the Docker environment:

```sh
$ cd notes-sound-generator
$ docker-compose build
```

- Replace the web socket URL with your local machine IP address in the file `src/mobile_app/lib/main.dart`.

- Build the Android or iOS App with Flutter:

```sh
$ cd src/mobile_app
$ flutter build apk
$ flutter build ipa
```

### Run on MacOS

```sh
$ chmod +x run.sh
$ ./run.sh
```

- And then, launch the App on your mobile device

### Run on other platforms

In order to execute the plugin you need to do the following steps in order:

- Run the docker container:

```sh
$ docker-compose up -d
```

- Launch the [MuseScore](https://musescore.org) program
- And then, launch the App on your mobile device

## Contributing

This project welcomes contributions and suggestions. If you use this code, please cite this repository.

## Citation

Credit to [CoderLine](https://github.com/CoderLine): [AlphaTab](https://github.com/CoderLine/alphaTab) is a cross platform music notation and guitar tablature rendering library. You can use alphaTab within your own website or application to load and display music sheets from data sources like Guitar Pro or the built in markup language named alphaTex.
