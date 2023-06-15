(async function load() {
    const go = new Go();
    const response = await fetch("/main.wasm");
    const buffer = await response.arrayBuffer();
    const result = await WebAssembly.instantiate(buffer, go.importObject);
    go.run(result.instance)
})()