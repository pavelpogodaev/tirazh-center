/**
 * Apply_Artboard_Names.jsx (Применить имена монтажек)
 * Версия: 3.4
 * Назначение: Переименование монтажных областей активного документа
 * по списку имён из Калькулятора спусков (v3.4).
 * Совместимость: Adobe Illustrator CC 2018 - 2026+ (macOS / Windows), ExtendScript (ES3).
 */

#target illustrator

(function() {
    var SCRIPT_NAME = "Apply_Artboard_Names";
    var SCRIPT_VERSION = "3.4";

    // 1. ЛОГИРОВАНИЕ
    function getTimestamp() {
        var d = new Date();
        var pad = function(n) { return (n < 10 ? "0" : "") + n; };
        return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "_" +
               pad(d.getHours()) + "-" + pad(d.getMinutes()) + "-" + pad(d.getSeconds());
    }

    var sessionTimestamp = getTimestamp();

    function logStep(level, message, context) {
        try {
            var logFolder = Folder.desktop;
            if (!logFolder.exists) logFolder = Folder.temp;
            var logFile = new File(logFolder.fsName + "/" + SCRIPT_NAME + "_v" + SCRIPT_VERSION + "_" + sessionTimestamp + ".log");
            logFile.encoding = "UTF-8";
            logFile.open("a");
            var docName = (app.documents.length > 0) ? app.activeDocument.name : "NO_DOC";
            var ctxStr = context ? " | " + context : "";
            var d = new Date();
            var pad = function(n) { return (n < 10 ? "0" : "") + n; };
            var timeStr = d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + " " +
                          pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
            logFile.write("[" + timeStr + "] [" + level + "] [" + SCRIPT_NAME + " v" + SCRIPT_VERSION + "] [" + docName + "] - " + message + ctxStr + "\n");
            logFile.close();
        } catch(err) {
            // Ignore log file write failure
        }
    }

    // 2. ИЗОЛИРОВАННАЯ ЧИСТАЯ ЛОГИКА (БЕЗ ВЫЗОВА DOM)
    function cleanTrim(str) {
        return str.replace(/^\s+|\s+$/g, "");
    }

    function parseNamesList(rawText) {
        if (!rawText) return [];
        var lines = rawText.split(/\r?\n/);
        var result = [];
        for (var i = 0; i < lines.length; i++) {
            var trimmed = cleanTrim(lines[i]);
            if (trimmed.length > 0) {
                result.push(trimmed);
            }
        }
        return result;
    }

    function calculateMapping(totalArtboards, namesList) {
        var count = Math.min(totalArtboards, namesList.length);
        var mapping = [];
        for (var i = 0; i < count; i++) {
            mapping.push({
                index: i,
                name: namesList[i]
            });
        }
        return mapping;
    }

    // 3. ВСТРОЕННОЕ ТЕСТИРОВАНИЕ (UNIT TESTS)
    function runSelfTests() {
        var sample = "  8135_1_Etiketka  \n\n8135_2_Etiketka\r\n  8135_3_Etiketka  ";
        var parsed = parseNamesList(sample);
        if (parsed.length !== 3) {
            throw new Error("Self-test failed: expected 3 items, got " + parsed.length);
        }
        if (parsed[0] !== "8135_1_Etiketka" || parsed[2] !== "8135_3_Etiketka") {
            throw new Error("Self-test failed: name mismatch in parsed items");
        }
        var mapping = calculateMapping(2, parsed);
        if (mapping.length !== 2 || mapping[1].name !== "8135_2_Etiketka") {
            throw new Error("Self-test failed: mapping calculation mismatch");
        }
    }

    // 4. ОСНОВНОЙ БЛОК
    try {
        logStep("INFO", "Старт скрипта применения имён монтажек", "");
        runSelfTests();

        if (app.documents.length === 0) {
            logStep("WARN", "Нет открытых документов в Illustrator", "");
            alert("Калькулятор спусков:\nНет открытого документа в Illustrator! Откройте макет перед запуском.");
            return;
        }

        var doc = app.activeDocument;
        var abCount = doc.artboards.length;
        logStep("INFO", "Документ открыт", "Артбордов: " + abCount);

        // Показ диалогового окна для вставки списка
        var win = new Window("dialog", "Именование монтажек (Калькулятор v3.4)");
        win.alignChildren = ["fill", "top"];
        win.margins = 16;

        var lbl = win.add("statictext", undefined, "Вставьте скопированный из Калькулятора список имён (Cmd+V / Ctrl+V):");
        var txt = win.add("edittext", [0, 0, 480, 180], "", {multiline: true, scrolling: true});
        txt.active = true;

        var info = win.add("statictext", undefined, "Монтажных областей в текущем файле: " + abCount);

        var grp = win.add("group");
        grp.alignment = "right";
        var btnCancel = grp.add("button", undefined, "Отмена", {name: "cancel"});
        var btnOk = grp.add("button", undefined, "Применить имена", {name: "ok"});

        btnOk.onClick = function() {
            var raw = txt.text;
            var cleanNames = parseNamesList(raw);

            if (cleanNames.length === 0) {
                alert("Список имён пуст! Вставьте имена из буфера обмена.");
                return;
            }

            var mapping = calculateMapping(abCount, cleanNames);
            for (var m = 0; m < mapping.length; m++) {
                doc.artboards[mapping[m].index].name = mapping[m].name;
            }

            logStep("INFO", "Имена успешно применены", "Переименовано: " + mapping.length + " из " + cleanNames.length);
            alert("Калькулятор спусков:\nУспешно переименовано монтажек: " + mapping.length + " из " + cleanNames.length);
            win.close();
        };

        win.show();
        logStep("INFO", "Диалог закрыт", "");

    } catch(e) {
        var crashDetails = "Message: " + e.message + "\nLine: " + e.line + "\nFile: " + (e.fileName || "unknown");
        logStep("CRITICAL", "Crash Context Dump: " + e.message, crashDetails);
        alert("Ошибка в скрипте переименования монтажек:\n" + e.message + "\nСтрока: " + e.line + "\n\nПодробности записаны в лог на Рабочем столе:\n" + Folder.desktop.fsName + "/" + SCRIPT_NAME + "_v" + SCRIPT_VERSION + "_" + sessionTimestamp + ".log");
    }
})();
