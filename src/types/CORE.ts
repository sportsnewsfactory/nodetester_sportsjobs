import { DB } from './DB';

export namespace CORE {
    /**
     * We start with the types and move on to namespaces
     */

    export type FolderType = {
        name: string;
        scope: Keys.Scope;
        folder_path: string | null;
        root_folder: Keys.RootFolder | null;
    };

    export type Brand = {
        brand_name: string;
        brand_path: string;
        root_folder: Keys.RootFolder;
    };

    // every product has a folder path
    export type Product = {
        product_name: Keys.Product;
        product_path: string;
    };

    // converting to distinct types...
    // export type ProductSubFolder<T extends Keys.AE.ProductSubFolder | Keys.PS.ProductSubFolder> = {
    //     product_name: Keys.Product;
    //     folder_type: T;
    //     subfolder_path: string;
    //     expected_variables: string; // comma separated list of variables prefixed with $
    // };

    export type ProductSubFolder__Base = {
        product_name: Keys.Product;
        subfolder_path: string;
        expected_variables: string; // comma separated list of variables prefixed with $
    };

    export type ItemSpecs = {
        type: string;
        mixed: boolean;
        sports: DB.SportName[];
    };

    export type Edition = {
        sport: string;
        brand_name: string;
        product_name: Keys.Product;
        lang: string;
        presenter_scheme: string;
        items: ItemSpecs[];

        export_file_name: string;
        project_file_name: string;
        project_save_file_name: string;
    };

    export namespace Keys {
        export type JobStatus =
            | 'fresh'
            | 'edited'
            | 'rendered'
            | 'qa-ready'
            | 'qa-pending'
            | 'archive'
            | 'uploaded'
            | 'error';

        export type ExpectedPathVariables =
            | 'sport'
            | 'lang'
            | 'brand_path'
            | 'product_path'
            | 'drive_path'
            | 'qnap_path';

        export type Software = 'AE' | 'PS';

        export type FolderPath = 'brand' | 'product';

        // every product has these subfolders
        export type ProductSubFolder__Base = 'saves' | 'exports' | 'templates';

        export type Product =
            | 'AE_Daily_News'
            | 'SNS_AE_News'
            | 'SNS_AE_Schedule'
            | 'SNS_AE_Ranking'
            | 'SNS_PS_Schedule'
            | 'SNS_PS_News'
            | 'SNS_PS_Ranking'
            | 'SNS_PS_Scores';

        export type Scope = 'general' | 'product specific' | 'brand specific';

        export type Lang = 'EN' | 'HI' | 'RO' | 'AR';

        export type RootFolder =
            | 'drive_path'
            | 'qnap_path'
            | 'local_storage_path';

        export namespace PS {
            export type ProductSubFolder =
                | ProductSubFolder__Base
                | 'static_backgrounds'
                | 'logos';
        }

        export namespace AE {
            export type ProductSubFolder =
                | ProductSubFolder__Base
                | 'narration'
                | 'dynamic_backgrounds'
                | 'presenters';

            export type ExpectedPathVariables =
                | CORE.Keys.ExpectedPathVariables
                | 'dynamic_backgrounds'
                | 'logos'
                | 'narration';
        }
    }

    export namespace AE {
        export type ProductSubFolder = ProductSubFolder__Base & {
            folder_type: Keys.AE.ProductSubFolder;
        };
    }

    export namespace PS {
        export type ProductSubFolder = ProductSubFolder__Base & {
            folder_type: Keys.PS.ProductSubFolder;
        };
    }
}

/*
The following is the sql statement used to insert the 5 tables mentioned above:

-- Here we'll define the general folder structure
-- for every brand and product.
-- the structure assumes that products are stored in a brand folder

DROP TABLE IF EXISTS config.CORE_L3_editions;
DROP TABLE IF EXISTS config.CORE_L3_product_subfolders;
DROP TABLE IF EXISTS config.CORE_L2_brands;
DROP TABLE IF EXISTS config.CORE_L2_folder_types;
DROP TABLE IF EXISTS config.CORE_L1_products;
DROP TABLE IF EXISTS config.CORE_L1_scopes;
DROP TABLE IF EXISTS config.CORE_L1_root_folders;
DROP TABLE IF EXISTS config.CORE_L1_langs;

CREATE TABLE config.CORE_L1_langs (
    lang VARCHAR(5) NOT NULL,
    PRIMARY KEY (lang)
);

INSERT INTO config.CORE_L1_langs (lang) VALUES 
('EN'),
('HI');

CREATE TABLE config.CORE_L1_root_folders (
    name VARCHAR(50) NOT NULL,
    PRIMARY KEY (name)
);

INSERT INTO config.CORE_L1_root_folders (name) VALUES 
('drive_path'),
('qnap_path'),
('local_storage_path');

CREATE TABLE config.CORE_L1_scopes (
    name VARCHAR(50) NOT NULL,
    PRIMARY KEY (name)
);

INSERT INTO config.CORE_L1_scopes (name) VALUES 
('general'),
('product specific'),
('brand specific');

CREATE TABLE config.CORE_L1_products (
    product_name VARCHAR(50) NOT NULL,
    product_path VARCHAR(255) NOT NULL,
    PRIMARY KEY (product_name)
);

INSERT INTO config.CORE_L1_products (product_name, product_path) VALUES 
('AE_Daily_News', '$brand_path/AE/Daily News/'),
('SNS_AE_News', '$brand_path/SNS/AE/News/'),
('SNS_AE_Tech', '$brand_path/SNS/AE/Tech/'),
('SNS_PS_Schedule', '$brand_path/SNS/PS/Schedule/'),
('SNS_PS_News', '$brand_path/SNS/PS/News/'),
('SNS_PS_Scores', '$brand_path/SNS/PS/Scores/'),
('SNS_PS_Ranking', '$brand_path/SNS/PS/Ranking/');

CREATE TABLE config.CORE_L2_folder_types (
    name VARCHAR(50) NOT NULL,
    scope VARCHAR(50) NOT NULL,
    folder_path VARCHAR(255),
    root_folder VARCHAR(255),
    PRIMARY KEY (name),
    FOREIGN KEY (scope) REFERENCES config.CORE_L1_scopes(name),
    FOREIGN KEY (root_folder) REFERENCES config.CORE_L1_root_folders(name)
);

-- not every product will have every folder type
INSERT INTO config.CORE_L2_folder_types (name, scope, folder_path, root_folder) VALUES 
('saves', 'product specific', NULL, NULL),
('exports', 'product specific', NULL, NULL),
('templates', 'product specific', NULL, NULL), 
('staticBackgrounds', 'general', 'Sports/S_Studio/S_S_Backgrounds/S_S_B_Static/', 'drive_path'), 
('dynamicBackgrounds', 'general', 'Sports/S_Studio/S_S_Backgrounds/S_S_B_Dynamic/', 'drive_path'), 
('logos', 'general', 'Sports/S_Studio/S_S_Logos/', 'drive_path'), 
('narration', 'general', 'Sports/S_Studio/S_S_Narration/S_S_N_Mixed/', 'drive_path'),
('presenters', 'brand specific', NULL, NULL);

CREATE TABLE config.CORE_L2_brands (
    brand_name VARCHAR(50) NOT NULL,
    brand_path VARCHAR(255) NOT NULL,
    root_folder VARCHAR(255) NOT NULL,
    FOREIGN KEY (root_folder) REFERENCES config.CORE_L1_root_folders(name),
    PRIMARY KEY (brand_name)
);

-- folder paths are dynamic, expecting a root_path
INSERT INTO config.CORE_L2_brands (brand_name, brand_path, root_folder) VALUES 
('Wolf777', 'Studio/Sports/S_Brands/Wolf777/', 'qnap_path'), 
('CWINZ', 'Studio/Sports/S_Brands/CWINZ/', 'qnap_path');

CREATE TABLE config.CORE_L3_product_subfolders (
    product_name VARCHAR(50) NOT NULL,
    folder_type VARCHAR(50) NOT NULL,
    subfolder_path VARCHAR(255) NOT NULL,
    expected_variables VARCHAR(255) , -- one or more of $sport, $lang, $brand_path, $product_path comma separated
    FOREIGN KEY (folder_type) REFERENCES config.CORE_L2_folder_types(name),
    FOREIGN KEY (product_name) REFERENCES config.CORE_L1_products(product_name),
    PRIMARY KEY (product_name, folder_type)
);

-- the following paths will be dynamic,
-- expecting either $product_path / $qnap_path / $drive_path

-- Note: we're using $product_path and not $brand_path since 
-- the product general path has been defined in the products table
-- and it is built upon the brand path

-- or the generic $narration_path / $dynamicBackgrounds_path / $logos_path / $staticBackgrounds_path
-- in the case of AE products we define narration and dynamicBackgrounds
-- in the case of PS products we define logos and staticBackgrounds

INSERT INTO config.CORE_L3_product_subfolders (product_name, folder_type, subfolder_path, expected_variables) VALUES 
('AE_Daily_News', 'saves', '$product_path/saves/', '$product_path'),
('AE_Daily_News', 'exports', '$product_path/exports/', '$product_path'),
('AE_Daily_News', 'templates', '$product_path/templates/', '$product_path'),
('AE_Daily_News', 'dynamicBackgrounds', '$general_path/', '$general_path'),
('AE_Daily_News', 'presenters', '$brand_path/presenters/$lang/', '$brand_path, $lang'),
('AE_Daily_News', 'narration', '$general_path/$sport/$lang/', '$general_path, $sport, $lang'),
('SNS_AE_News', 'saves', '$product_path/saves/', '$product_path'),
('SNS_AE_News', 'exports', '$product_path/exports/', '$product_path'),
('SNS_AE_News', 'templates', '$product_path/templates/', '$product_path'),
('SNS_AE_News', 'dynamicBackgrounds', '$general_path/', '$general_path'),
('SNS_AE_News', 'presenters', '$brand_path/presenters/$lang/', '$brand_path, $lang'),
('SNS_AE_News', 'narration', '$general_path/$sport/$lang/', '$general_path, $sport, $lang'),
('SNS_AE_Tech', 'saves', '$product_path/saves/', '$product_path'),
('SNS_AE_Tech', 'exports', '$product_path/exports/', '$product_path'),
('SNS_AE_Tech', 'templates', '$product_path/templates/', '$product_path'),
('SNS_AE_Tech', 'dynamicBackgrounds', '$general_path/', '$general_path'),
('SNS_AE_Tech', 'narration', '$general_path/$sport/$lang/', '$general_path, $sport, $lang'),
('SNS_PS_Schedule', 'saves', '$product_path/saves/', '$product_path'),
('SNS_PS_Schedule', 'exports', '$product_path/exports/', '$product_path'),
('SNS_PS_Schedule', 'templates', '$product_path/templates/', '$product_path'),
('SNS_PS_Schedule', 'staticBackgrounds', '$general_path/', '$general_path'),
('SNS_PS_Schedule', 'logos', '$general_path/$sport/', '$general_path, $sport'),
('SNS_PS_News', 'saves', '$product_path/saves/', '$product_path'),
('SNS_PS_News', 'exports', '$product_path/exports/', '$product_path'),
('SNS_PS_News', 'templates', '$product_path/templates/', '$product_path'),
('SNS_PS_News', 'staticBackgrounds', '$general_path/', '$general_path'),
('SNS_PS_News', 'logos', '$general_path/$sport/', '$general_path, $sport'),
('SNS_PS_Scores', 'saves', '$product_path/saves/', '$product_path'),
('SNS_PS_Scores', 'exports', '$product_path/exports/', '$product_path'),
('SNS_PS_Scores', 'templates', '$product_path/templates/', '$product_path'),
('SNS_PS_Scores', 'staticBackgrounds', '$general_path', '$general_path'),
('SNS_PS_Scores', 'logos', '$general_path/$sport/', '$general_path, $sport'),
('SNS_PS_Ranking', 'saves', '$product_path/saves/', '$product_path'),
('SNS_PS_Ranking', 'exports', '$product_path/exports/', '$product_path'),
('SNS_PS_Ranking', 'templates', '$product_path/templates/', '$product_path'),
('SNS_PS_Ranking', 'staticBackgrounds', '$general_path/$sport/', '$general_path, $sport'),
('SNS_PS_Ranking', 'logos', '$general_path/$sport/', '$general_path, $sport');

-- here we assign a product and language to a brand
CREATE TABLE config.CORE_L3_editions (
    brand_name VARCHAR(50) NOT NULL,
    product_name VARCHAR(50) NOT NULL,
    lang VARCHAR(255) NOT NULL,
    FOREIGN KEY (brand_name) REFERENCES config.CORE_L2_brands(brand_name),
    FOREIGN KEY (product_name) REFERENCES config.CORE_L1_products(product_name),
    FOREIGN KEY (lang) REFERENCES config.CORE_L1_langs(lang),
    PRIMARY KEY (brand_name, product_name, lang)
);

INSERT INTO config.CORE_L3_editions (brand_name, product_name, lang) VALUES 
('CWINZ', 'AE_Daily_News', 'HI'),
('CWINZ', 'SNS_AE_News', 'HI'),
('Wolf777', 'AE_Daily_News', 'HI'),
('Wolf777', 'SNS_PS_Ranking', 'HI');

*/
