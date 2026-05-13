const code = `{
    "dependencies": {
        "socket.io": "^4.5.4" // Added socket.io
    }
}`;
console.log(code.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim());
