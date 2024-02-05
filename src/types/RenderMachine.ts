export type RenderMachinePathKey =
    | 'drive_path'
    | 'local_storage_path'
    | 'extensions_path'
    | 'qnap_path';

export type RenderMachinePaths = { [key in RenderMachinePathKey]: string };

export type RenderMachine = RenderMachinePaths & {
    name: string;
    os: string;
    root_user_name: string;
    machine_type: string;
    average_edition_rendering_time_in_seconds: number;
};
