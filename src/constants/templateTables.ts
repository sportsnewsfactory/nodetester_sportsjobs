const backofficeDBName = 'backoffice';

export const TMPTables = {
    // what is
    elements: `${backofficeDBName}.OS_TMP_L01_Elements`,
    objects: `${backofficeDBName}.OS_TMP_L00_Objects`,
    templates: `${backofficeDBName}.OS_TMP_L00_Templates`,

    templateMainLayers: `${backofficeDBName}.OS_TMP_L01_Template_Main_Layers`,
    templateClusters: `${backofficeDBName}.OS_TMP_L01_Template_Clusters`,
    templateElements: `${backofficeDBName}.OS_TMP_L02_Template_Elements`,
    
    // every objects' parent cluster can be found in objects
    objectElements: `${backofficeDBName}.OS_TMP_L02_Object_Elements`,
    actions: `${backofficeDBName}.OS_TMP_L00_Actions`,
    elementActions: `${backofficeDBName}.OS_TMP_L02_Element_Actions`,

    templateActions: `${backofficeDBName}.OS_TMP_L03_Template_Actions`,

    clusterActions: `${backofficeDBName}.OS_TMP_L03_Cluster_Actions`,
}