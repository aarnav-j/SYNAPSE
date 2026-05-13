const { parseBatchOutput } = require("./backend/utils/parser");
const fs = require("fs");

const testData = `<FILE: server.js>
<EXPLANATION>
test
</EXPLANATION>
<CODE>
console.log('hello');
</CODE>
</FILE>`;

console.log(parseBatchOutput(testData));
