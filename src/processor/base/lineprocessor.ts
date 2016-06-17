import {JdbState} from "../../jdb"

export interface LineProcessor<T> {
    process(line: string): any;
    result(): T;
}