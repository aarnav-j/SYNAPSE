const { saveFile } = require("./backend/utils/fileManager");

saveFile("test_project", { filename: "backend/test.js", code: "console.log('test');" });
console.log("Done");
