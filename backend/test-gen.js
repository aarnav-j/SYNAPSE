async function test() {
    try {
        console.log("Starting generation...");
        const res = await fetch("http://localhost:3001/prompt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: "Build a simple hello world app" })
        });
        const data = await res.json();
        console.log(data);
    } catch (err) {
        console.error(err);
    }
}
test();
