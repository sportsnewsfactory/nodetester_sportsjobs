import { AE } from "../../../types/AE";

// HARDCODED-MODIFY
export function LEGACY__syncMainCompLayersSNS(
    trimSyncData: AE.Json.TS.Sequence,
){
    trimSyncData.push({
        method: 'syncMarkerToOutPoint',
        padding: 0,
        layerAName: 'outro',
        layerBName: 'news-cluster1',
    });

    const syncSoundtrack = () => {
        const syncMarker: AE.Json.TS.Sync = {
            method: 'syncMarkerToOutPoint',
            padding: 0,
            layerAName: 'soundtrack-outro',
            layerBName: 'presenter-close-container',
        }
        trimSyncData.push(syncMarker);

        // now we trim the loop to the beginning of
        // the soundtrack-outro
        const trim: AE.Json.TS.Trim = {
            method: 'trimOutToIn',
            layerOrCompName: 'soundtrack-body',
            trimToLayer: 'soundtrack-outro',
        };
        trimSyncData.push(trim);
    }

    syncSoundtrack();
}