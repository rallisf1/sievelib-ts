import { Command } from './commands.cjs';
import { Parser } from './parser.cjs';

declare class FilterAlreadyExists extends Error {
}
interface Filter {
    name: string;
    content: Command;
    enabled: boolean;
    description?: string;
}
type FilterCondition = readonly unknown[];
type FilterAction = readonly unknown[];
declare class FiltersSet {
    name: string;
    filterNamePretext: string;
    filterDescPretext: string;
    requires: string[];
    filters: Filter[];
    readonly supportedTests: string[];
    constructor(name: string, filterNamePretext?: string, filterDescPretext?: string);
    toString(): string;
    require(name: string): void;
    private find;
    filterExists(name: string): boolean;
    filter_exists(name: string): boolean;
    private addString;
    private static splitMatchTag;
    private create;
    addfilter(name: string, conditions: FilterCondition[], actions: FilterAction[], matchtype?: string): void;
    updatefilter(oldname: string, newname: string, conditions: FilterCondition[], actions: FilterAction[], matchtype?: string): boolean;
    replacefilter(oldname: string, content: Command, newname?: string, description?: string): boolean;
    getfilter(name: string): Command | undefined;
    removefilter(name: string): boolean;
    isFilterDisabled(name: string): boolean;
    is_filter_disabled(name: string): boolean;
    enablefilter(name: string): boolean;
    disablefilter(name: string): boolean;
    movefilter(name: string, direction: "up" | "down"): boolean;
    fromParserResult(parser: Parser): void;
    get_filter_matchtype(name: string): "allof" | "anyof" | null;
    private conditionTuple;
    get_filter_conditions(name: string): unknown[][] | null;
    get_filter_actions(name: string): unknown[][] | null;
    toSieve(): string;
    tosieve(): string;
}

export { type Filter, type FilterAction, FilterAlreadyExists, type FilterCondition, FiltersSet };
