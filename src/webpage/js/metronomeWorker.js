{
  function sleep(delay) {
    var start = new Date().getTime();
    while (new Date().getTime() < start + delay);
  }

  self.onmessage = function (message) {
    if (message.data.pauses === undefined) return;
    let timeSignaturePauses = message.data.pauses;
    let startIndex = message.data.startIndex;
    for (let index = startIndex; index < timeSignaturePauses.length; index++) {
      const element = timeSignaturePauses[index];
      self.postMessage(element);
      sleep(element.waitTime * 1000);
    }
  };
}
