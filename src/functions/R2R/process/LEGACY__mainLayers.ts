import { AE } from "../../../types/AE";

// HARDCODED-MODIFY
export function LEGACY__syncMainCompLayers(
    trimSyncData: AE.Json.TS.Sequence,
){
    // trim presenter containers
    const presenteropenTrim: AE.Json.TS.Trim = {
        method: 'trimByAudio',
        layerOrCompName: 'presenter-open-container',
    };
    trimSyncData.push(presenteropenTrim);
    const presentercloseTrim: AE.Json.TS.Trim = {
        method: 'trimByAudio',
        layerOrCompName: 'presenter-close-container',
    };
    trimSyncData.push(presentercloseTrim);
    
    // presenter-open to Intro
    trimSyncData.push({
        method: 'syncHeadTail',
        padding: 0,
        layerAName: 'presenter-open-container',
        layerBName: 'intro',
    });

    // News comp 1 to presenter-open
    trimSyncData.push({
        method: 'syncHeadTail',
        padding: 0,
        layerAName: 'news-cluster1',
        layerBName: 'presenter-open-container',
    });

    // news-cluster2 to news-cluster1
    trimSyncData.push({
        method: 'syncHeadTail',
        padding: 0,
        layerAName: 'news-cluster2',
        layerBName: 'news-cluster1',
    });
    
    // presenter-close to news-cluster2
    trimSyncData.push({
        method: 'syncHeadTail',
        padding: 0,
        layerAName: 'presenter-close-container',
        layerBName: 'news-cluster2',
    });

    // Ending to presenter-close via single marker
    trimSyncData.push({
        method: 'syncMarkerToOutPoint',
        padding: 0,
        layerAName: 'outro',
        layerBName: 'presenter-close-container',
    });

    const syncTransitions = () => {
        const transitionLayerNames = [
            'trans-presenter-open-container',
            'trans-news-cluster1',
            'trans-news-cluster2',
        ];

        const syncToLayers = [
            'presenter-open-container',
            'news-cluster1',
            'news-cluster2',
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