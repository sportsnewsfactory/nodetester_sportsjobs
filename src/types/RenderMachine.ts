export interface RenderMachine {
    /*
    name VARCHAR(10) PRIMARY KEY,
    os VARCHAR(10) NOT NULL CHECK (os in ('mac','win')),
    root_user_name VARCHAR(50) NOT NULL,
    drive_path VARCHAR(250) NOT NULL,
    local_storage_path VARCHAR(250) NOT NULL,
    extensions_path VARCHAR(250) NOT NULL,
    average_edition_rendering_time_in_seconds INT
    */
    name: string;
    os: string;
    root_user_name: string;
    drive_path: string;
    local_storage_path: string;
    extensions_path: string;
    qnap_path: string;
    machine_type: string;
    average_edition_rendering_time_in_seconds: number;
}