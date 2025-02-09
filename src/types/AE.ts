import { CORE } from "./CORE";
import { DB } from "./DB";

/**
 * Here we define the final JSON data that
 * needs to be sent to the AE extension
 */
export namespace AE {
    export namespace Method {
        export type Trim =
            | 'trimByAudio'
            | 'trimByVideo'
            | 'trimOutToIn'
            | 'trimInToOut'
            | 'trimWorkareaToLayerOut';
        export type Sync =
            | 'syncSingleMarkers'
            | 'syncMarkerToOutPoint'
            | 'syncHeadTail'
            | 'syncToTime';
        export type Marker = 'markersSync';
        export type Resize =
            | 'fitToComp'
            | 'fitToMedia'
            | 'toCompWidth'
            | 'toCompHeight';
    }

    export namespace Json {
        export namespace AbsolutePath {
            export type AbsKey =
                | 'exportFile'
                | 'projectFile'
                | 'projectSaveFile';
            export type Obj = { [key in AbsKey]: string };
        }

        export namespace TS {
            // TrimSync
            export type Sequence = (Trim | Sync | SyncMarker)[];

            export type Trim = {
                method: Method.Trim; // to identify the action on jsx side
                threshold?: number; // what db level to set for trimming
                padIn?: number; // how many frames to leave in before hitting entry threshold?
                padOut?: number; // how many frames to leave after exit threshold (tail)?
                layerOrCompName: string; // must be unique
                trimToLayer?: string; // must be unique
                time?: number; // in seconds -- check that
            };
            export type Sync = {
                method: Method.Sync; // to identify the action on jsx side
                padding: number;
                layerAName: string; // must be unique
                layerBName: string; // must be unique
            };
            export type SyncMarker = {
                method: Method.Marker; // to identify the action on jsx side
                padding: number;
                layerAName: string; // must be unique
                layerBName: string[]; // must be unique
            };
        }

        export type Payload = {
            files: FileImport[];
            texts: TextImport[];
            trimSyncData: TS.Sequence;
            names: {
                exportComp: string; // the composition to be exported
                importBin: string; // the bin to import the files into
            };
            paths: AbsolutePath.Obj; //
            // dbg: DebugData; // DebugData;
            dbgLevel: number;
            aeRenderSeq: string[];
        };

        export type FileImport = {
            absolutePath: string;
            compositionName: string; // the composition into which the file should be inserted
            resizeAction: Method.Resize | null;
        };

        export type TextImport = {
            text: string;
            textLayerName: string; // texts are inserted into TextLayers
            recursiveInsertion: boolean; // if true, insert into all layers with this name
        };

        export type DebugData = {
            saveExportClose: SaveExportClose;
            dbgLevel: number; //0 = no debugger, the higher the number the more alerts will happen
        };

        export type SaveExportClose = {
            isSave: boolean;
            isExport: boolean;
            isClose: boolean;
        };
    }

    export type Job = {
        brand_name: string;
        product_name: CORE.Keys.Product;
        target_date: Date;
        lang: string;
        status: CORE.Keys.JobStatus;
        when_created: Date;
        when_updated: Date;
    };
}
