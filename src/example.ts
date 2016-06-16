import {Jdb} from "./jdb"
import {resolve} from "path"

function wait(ms = 200) {
    return new Promise(res => setTimeout(res, ms));
}

const jdb = new Jdb();

(function() {

    jdb.launch("Main", {
        workingDir: resolve(__dirname, "..", "java")
    })
    .then(_ => jdb.stopAt("Main", 4))
    .then(_ => jdb.stopAt("Main", 42))
    .then(_ => jdb.cont())
    .then(_ => jdb.where())
    .then(_ => jdb.stopAt("Main", 7))
    .then(_ => jdb.step())
    .then(_ => jdb.where())
    .then(_ => jdb.cont())
    .then(_ => jdb.where())
    .then(_ => jdb.cont())
    .then(_ => jdb.where())
    .then(_ => {
        process.exit(0);
    })
    .catch(e => {
        console.error(e)
    });
})();