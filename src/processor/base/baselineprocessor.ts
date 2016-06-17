import {LineProcessor} from "./lineprocessor"
import {JdbState} from "../../jdb"

export interface BaseResult {
    breakpoints: Array<{className: string, lineNr: number, valid: boolean}>; 
}

export class BaseLineProcessor implements LineProcessor<BaseResult> {

    protected breakpoints: Array<{className: string, lineNr: number, valid: boolean}> = [];

    public result(): BaseResult {
        return {
            breakpoints: this.breakpoints
        };
    }

    process(line: string) {
        try {
            let [_, className, lineNr, reason] = line.match(/Unable to set deferred breakpoint (\w+):(\d+) : (.+)$/)
            this.breakpoints.push({
                className,
                lineNr: +lineNr,
                valid: false
            });
        } catch(e) {}

        try {
            let [_, className, lineNr] = line.match(/Set deferred breakpoint (\w+?):(\d+?)/)
            this.breakpoints.push({
                className,
                lineNr: +lineNr,
                valid: true
            });
        } catch(e) {}
    }

    protected setBreakpoint(className: string, lineNr: number, valid: boolean) {
        let exists = false;

        this.breakpoints = this.breakpoints.map(br => {
            if(br.className === className && br.lineNr === br.lineNr) {
                br.valid = valid;
                exists = true;
                return br;
            }
        });

        if(!exists) {
            this.breakpoints.push({
                className,
                lineNr,
                valid
            })
        }
    }
}