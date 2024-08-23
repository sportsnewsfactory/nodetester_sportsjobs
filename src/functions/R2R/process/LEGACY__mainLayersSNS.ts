import { AE } from "../../../types/AE";

// HARDCODED-MODIFY
export function LEGACY__syncMainCompLayersSNS(
    trimSyncData: AE.Json.TS.Sequence,
){
    trimSyncData.push({
        method: 'trimByAudio',
        layerOrCompName: 'news-cluster-container'
    });

    trimSyncData.push({
        method: 'syncHeadTail',
        layerAName: 'news-cluster-container',
        layerBName: 'intro',
        padding: 0
    });
    
    trimSyncData.push({
        method: 'syncMarkerToOutPoint',
        padding: 0,
        layerAName: 'outro',
        layerBName: 'news-cluster-container',
    });

    const syncTransitions = () => {
        const transitionLayerNames = [
            'trans-intro',
            'trans-news-cluster-container',
        ];

        const syncToLayers = [
            'intro',
            'news-cluster-container',
        ]

        for (let i=0; i<transitionLayerNames.length; i++){
            const transLayerName = transitionLayerNames[i];
            const syncToLayer = syncToLayers[i];
            const syncMarker: AE.Json.TS.Sync = {
                method: 'syncMarkerToOutPoint',
                padding: 0,
                layerAName: transLayerName,
                layerBName: syncToLayer,
            }
            trimSyncData.push(syncMarker);
        }
    }

    syncTransitions();

    const syncSoundtrack = () => {
        const syncMarker: AE.Json.TS.Sync = {
            method: 'syncMarkerToOutPoint',
            padding: 0,
            layerAName: 'soundtrack-outro',
            layerBName: 'news-cluster-container',
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