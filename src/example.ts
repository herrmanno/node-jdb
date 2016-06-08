import {Jdb} from "./jdb"
import {resolve} from "path"

function wait(ms = 200) {
    return new Promise(res => setTimeout(res, ms));
}

const jdb = new Jdb();

(async function() {

    jdb.launch("Main", {
        workingDir: resolve(__dirname, "..", "java")
    })

    await wait();

    await jdb.step();
    await jdb.step();
    await jdb.step();

    console.log("!!! finisehd");
    process.exit(0);
})();