import MuseScore 3.0

MuseScore {
    id: notesoundgeneratorscope
    menuPath: "Plugins.NotesSoundGenerator"
    description: "A musescore plugin for blind people - notes sound generator."
    version: "1.0"
    pluginType: "dock"
    anchors.fill: parent

    QProcess {
        id: process
    }

    function openGenerator(filePath, filename) {
        var newFilePath = filePath + "/src/" + filename;
        writeScore(curScore, newFilePath, "xml");
        return newFilePath;
    }

    onRun: {
        var filename = "new-exported.xml";
        var newFilePath = openGenerator(filePath, filename);
        Qt.openUrlExternally("http://localhost:8000?filename="+filename); 
        Qt.quit();
    }
}