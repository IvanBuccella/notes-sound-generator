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
      if (element.isFirstBeat) {
        self.postMessage("green");
      } else {
        self.postMessage("red");
      }
      sleep(element.waitTime * 1000);
    }
  };
}
