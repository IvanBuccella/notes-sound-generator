import MuseScore 3.0
import QtQuick.Dialogs 1.2

MuseScore {
    id: notesoundgeneratorscope
    menuPath: "Plugins.Open Notes Sound Generator"
    description: "A musescore plugin for blind people - notes sound generator."
    version: "1.0"
    pluginType: "dock"
    anchors.fill: parent

    MessageDialog {
		id: alert;
		title: "";
		icon: StandardIcon.Information;
	}

    function openGenerator(filePath, filename) {
        var newFilePath = filePath + "/src/webpage/" + filename;
        if (!writeScore(curScore, newFilePath, "musicxml")) {
            alert.text = "Cannot export the current score, try again.";
            alert.open();
            return;
        }
        Qt.openUrlExternally("http://localhost:8000?filename="+filename);
        Qt.quit();
    }

    onRun: {
        var filename = "new-exported.musicxml";
        openGenerator(filePath, filename);
    }
}