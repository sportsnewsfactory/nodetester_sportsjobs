import { AE } from "../AE";

export namespace Template {
    export namespace Action {
        export type Type = 
        | 'insertFile'
        | 'insertText'
        | 'trim'
        | 'sync'
        | 'marker'

        export type Method = 
        | AE.Method.Trim 
        | AE.Method.Sync 
        | AE.Method.Marker 
        | AE.Method.Resize
        // | 'fitToComp'
        // | 'fitToMedia'
        // | 'toCompHeight'
        // | 'toCompWidth'
        // | 'trimByAudio'
        // | 'trimByVideo'
        // | 'trimInToOut'
        // | 'trimOutToIn'
        // | 'trimWorkareaToLayerOut'
        // | 'syncHeadTail'
        // | 'syncMarkerToOutPoint'
        // | 'syncToTime'
        // | 'markersSync'
    }
    
    export type Action = {
        action_type: Action.Type;
        method: Action.Method;
        description: string;
    }
    
    export namespace Record {
        export type Element = {
            template_name: string;
            element_name: string;
            element_index: number;
            element_subtype: string | null;
        }
        
        export type Cluster = {
            template_name: string;
            cluster_name: string;
            cluster_index: number;
            num_object_instances: number;
            variable_num_objects: boolean;
            is_optional: boolean;
        }
    }

    export namespace Cluster {
        export type Action = {
            cluster_name: string;
            action_type: Action.Type;
            method: Action.Method;
            action_order: number;
            target_element_a: string | null;
            target_element_b: string | null;
            variable_element_instances: boolean;
            pad_in: number | null;
            pad_out: number | null;
        }
    }

    export type Cluster = {
        cluster_name: string;
    } 
    
    export namespace Obj {
        export type Element = {
            object_name: string;
            element_name: string;
            element_index: number;
            element_subtype: string | null;
            is_optional: boolean;
            description: string;
        }
    }

    export type Obj = {
        object_name: string;
        cluster_name: string | null;
        description: string;
    }

    export namespace Element {    
        export type Type = 'footageFile' | 'text' | 'preexisting' | 'audioFile';
            
        type Base = {
            element_name: string;
            element_type: Type;
            container_type: 'layer' | 'comp' | null;
            label_color: string | null;
        }
        
        export type DB_Blueprint = Base & {
            naming_scheme: string;
            variables: string | null;
            description: string | null;
        }
        /**
         * Here the naming scheme and variables are resolved
         */
        export type Realized = Base & {
            layerCompName: string;
            isOptional: boolean;
            content?: string;
        }

        export type Action = {
            element_name: string;
            action_type: Action.Type;
            method: Action.Method;
            action_order: number;
        }
    }
}