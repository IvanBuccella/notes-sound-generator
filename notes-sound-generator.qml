import MuseScore 3.0

MuseScore {
    id: notesoundgeneratorscope
    menuPath: "Plugins.Open Notes Sound Generator"
    description: "A musescore plugin for blind people - notes sound generator."
    version: "1.0"
    pluginType: "dock"
    anchors.fill: parent

    QProcess {
        id: process
    }

    function openGenerator(filePath, filename) {
        var newFilePath = filePath + "/src/" + filename;
        if (writeScore(curScore, newFilePath, "xml")) {
            Qt.openUrlExternally("http://localhost:8000?filename="+filename);
        }
    }

    onRun: {
        var filename = "new-exported.xml";
        openGenerator(filePath, filename);
        Qt.quit();
    }
}