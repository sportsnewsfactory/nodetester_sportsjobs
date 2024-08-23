import { AE } from "../../../types/AE";

// HARDCODED-MODIFY
export function LEGACY__syncMainCompLayersSNS(
    trimSyncData: AE.Json.TS.Sequence,
){
    trimSyncData.push({
        method: 'trimByAudio',
        layerOrCompName: 'news-cluster-container'
    })

    trimSyncData.push({
        method: 'syncHeadTail',
        layerAName: 'news-cluster-container',
        layerBName: 'intro',
        padding: 0
    })
    
    trimSyncData.push({
        method: 'syncMarkerToOutPoint',
        padding: 0,
        layerAName: 'outro',
        layerBName: 'news-cluster-container',
    });

    const syncTransitions = () => {
        const syncMarker: AE.Json.TS.Sync = {
            method: 'syncMarkerToOutPoint',
            padding: 0,
            layerAName: 'trans-news-cluster-container',
            layerBName: 'news-cluster-container',
        }
        trimSyncData.push(syncMarker);
    }

    syncTransitions();

    const syncSoundtrack = () => {
        const syncMarker: AE.Json.TS.Sync = {
            method: 'syncMarkerToOutPoint',
            padding: 0,
            layerAName: 'soundtrack-body',
            layerBName: 'news-cluster-container',
        }
        trimSyncData.push(syncMarker);

        // now we trim the loop to the beginning of
        // the soundtrack-outro
        const trim: AE.Json.TS.Trim = {
            method: 'trimInToOut',
            layerOrCompName: 'soundtrack-body',
            trimToLayer: 'soundtrack-intro',
        };
        trimSyncData.push(trim);
    }

    syncSoundtrack();
}