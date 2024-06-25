import { AE } from "../../../types/AE";
import { Template } from "../../../types/CORE/Template";

export function newsClusterLevel(
    clusterActions: Template.Cluster.Action[],
    templateClusters: Template.Record.Cluster[],
    elementBluePrints: Template.Element.DB_Blueprint[],
    trimSyncData: AE.Json.TS.Sequence
){
    try {
        // all actions to be generically performed on a news cluster
        const newsClusterActions: Template.Cluster.Action[] = clusterActions
            .filter(action => action.cluster_name === 'news-cluster')
            .sort((a, b) => a.action_order - b.action_order);

        // all news clusters in the given template
        const templateNewsClusters: Template.Record.Cluster[] = templateClusters
            .filter(cluster => cluster.cluster_name === 'news-cluster')
            .sort((a, b) => a.cluster_index - b.cluster_index);

        for (const newsCluster of templateNewsClusters){
            const newsClusterLayerCompName = `news-cluster${newsCluster.cluster_index}`;
            const numNewsItems = Number(newsCluster.num_object_instances);
            const previousNewsItems = Number(newsCluster.cluster_index) > 1 ? 3 : 0;

            for (const clusterAction of newsClusterActions){
                switch (clusterAction.action_type){
                    case 'trim': {
                        const trim: AE.Json.TS.Trim = {
                            method: clusterAction.method as AE.Method.Trim,
                            layerOrCompName: newsClusterLayerCompName,
                        };
                        trimSyncData.push(trim);
                        break;
                    }
                    case 'sync': {
                        // console.log('sync');
                        
                        const targetElementA: Template.Element.DB_Blueprint | undefined = 
                            elementBluePrints.find(e => e.element_name === clusterAction.target_element_a);
                        
                        if (!targetElementA) throw `Target element A not found for cluster action ${clusterAction.cluster_name} ${clusterAction.action_type}`;

                        const targetElementB: Template.Element.DB_Blueprint | undefined =
                            elementBluePrints.find(e => e.element_name === clusterAction.target_element_b);

                        if (clusterAction.variable_element_instances){
                            /**
                             * we need to sync all the instances
                             * A: if there's no target_element_b we sync to each other
                             * B: if there's a target_element_b we sync to previous index of target_element_b
                             */

                            // stickToMe
                            const targetElementALayerName = targetElementA.naming_scheme
                                .replace('$item_type', 'news-item')
                                .replace('$num_item', String(1+previousNewsItems));

                            const targetElementBLayerName = `stickToMe${newsCluster.cluster_index}`;

                            const sync: AE.Json.TS.Sync = {
                                method: clusterAction.method as AE.Method.Sync,
                                padding: clusterAction.pad_in || 0,
                                layerAName: targetElementALayerName,
                                layerBName: targetElementBLayerName,
                            };

                            trimSyncData.push(sync);

                            for (let i=1; i<numNewsItems; i++){
                                const numItem = i+1+previousNewsItems;

                                const targetElementALayerName = targetElementA.naming_scheme
                                    .replace('$item_type', 'news-item')
                                    .replace('$num_item', String(numItem));

                                let targetElementBLayerName: string;

                                if (targetElementB){
                                    targetElementBLayerName = targetElementB.naming_scheme
                                        .replace('$item_type', 'news-item')
                                        .replace('$num_item', String(numItem-1));
                                } else {
                                    targetElementBLayerName = targetElementA.naming_scheme
                                        .replace('$item_type', 'news-item')
                                        .replace('$num_item', String(numItem-1));
                                }   

                                const sync: AE.Json.TS.Sync = {
                                    method: clusterAction.method as AE.Method.Sync,
                                    padding: clusterAction.pad_in || 0,
                                    layerAName: targetElementALayerName,
                                    layerBName: targetElementBLayerName,
                                };

                                trimSyncData.push(sync);
                            }
                        } else {
                            if (!targetElementB) throw `Target element B not found for cluster action ${clusterAction.cluster_name} ${clusterAction.action_type}`;
                            // regular sync of single instance
                            // there are none in the news-cluster
                            throw `Single instance sync not supposed to exist in the news-cluster`;
                        }
                        break;
                    }
                    case 'marker': {
                        /**
                         * In the case of a marker action_type
                         * target_element_b represents all the 
                         * layers of this type (narration) in the cluster
                         */
                        
                        const targetElementA: Template.Element.DB_Blueprint | undefined = 
                            elementBluePrints.find(e => e.element_name === clusterAction.target_element_a);
                        
                        if (!targetElementA) throw `Target element A not found for cluster action ${clusterAction.cluster_name} ${clusterAction.action_type}`;

                        const targetElementB: Template.Element.DB_Blueprint | undefined =
                            elementBluePrints.find(e => e.element_name === clusterAction.target_element_b);

                        if (!targetElementB) throw `Target element B not found for cluster action ${clusterAction.cluster_name} ${clusterAction.action_type}`;

                        const layerAName = targetElementA.naming_scheme
                            .replace('$item_type', 'news-cluster')
                            .replace('$num_item', String(newsCluster.cluster_index));

                        let targetLayerBNames: string[] = [];
                        for (let j=1+previousNewsItems; j<=numNewsItems+previousNewsItems; j++){
                            const targetElementBLayerName = targetElementB.naming_scheme
                                .replace('$item_type', 'news-item')
                                .replace('$num_item', String(j));

                            targetLayerBNames.push(targetElementBLayerName);
                        }
                        
                        const marker: AE.Json.TS.SyncMarker = {
                            method: clusterAction.method as AE.Method.Marker,
                            padding: clusterAction.pad_in || 0,
                            layerAName: layerAName,
                            layerBName: targetLayerBNames,
                        };

                        trimSyncData.push(marker);

                        break;
                    }
                    default: throw `Action type not recognized`;
                }
            }
            
        }
    } catch (e) {
        throw `Error in newsClusterLevel: ${e}`
    }
}