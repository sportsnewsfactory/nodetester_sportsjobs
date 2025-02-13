import fs from 'fs';
import { BUCKETS } from '../../config/BUCKETS';
import { CORE } from '../../types/CORE';
import { S3Bucket } from './AWS/S3Bucket';
import { DB } from '../../types/DB';
import { TimeDeltas } from './TimeDeltas';

export class SeekFile {
    /**
     * This is a hard coded folder structure
     * for determining the location of an asset file
     */
    static folderStructure: {
        [key in CORE.FileAsset.AssetType]: {
            [key in CORE.FileAsset.SourceFolder]?: string;
        };
    } = {
        chart: {
            destination: `assets/$EDITION_TYPE/Charts/$EDITION_DATE_yyyymmdd/`,
            local: 'Studio/QA Daily/Backup/$EDITION_TYPE/Charts/$EDITION_DATE_ddmmyy/',
            // qnap: '',
            drive: 'Studio/Daily Charts/$EDITION_TYPE_AUG/$EDITION_DATE_ddmmyy/',
            bucketIn: 'assets/charts/$EDITION_TYPE/$EDITION_DATE_yyyymmdd/',
        },
        background: {
            destination: `Studio/QA Daily/Assets/backgrounds/video/`,
            local: 'Studio/Production All/',
            // qnap: '',
            // drive: '',
            bucketIn: 'assets/backgrounds/video/',
        },
        logo: {
            // destination: '',
            // local: '',
            // qnap: '',
            // drive: '',
            // bucketIn: '',
        },
        narration: {
            destination: `assets/$EDITION_TYPE/narration/$NARRATION_LANG_SHORT/$EDITION_DATE_yyyymmdd/`,
            local: 'Studio/QA Daily/Backup/$EDITION_TYPE/Narration/$NARRATION_LANG/$EDITION_DATE_ddmmyy/',
            // qnap: '',
            drive: 'Studio/Daily Narration/$NARRATION_LANG/$EDITION_DATE_dddmm/',
            bucketIn:
                'Assets/Narration/$EDITION_TYPE/$NARRATION_LANG_SHORT/$EDITION_DATE_yyyymmdd/',
        },
        presenter: {
            destination: `assets/presenters/$BRAND_NAME/$LANG_SHORT_CODE/`,
            local: 'Studio/Production All/',
            // qnap: '',
            drive: 'oneRow/presenters/$BRAND_NAME/$LANG_SHORT_CODE/',
            bucketIn: 'Assets/$BRAND_NAME/LANG_SHORT_CODE/presenters/',
        },
        other: {},
    };

    location: string | null = null;
    destination: string | null = null;
    local: string | null = null;
    drive: string | null = null;
    qnap: string | null = null;
    bucketIn: string | null = null;
    bucketOut: string | null = null;
    /**
     * This class aims to replace the organizer.
     * By these two params @param fileName and @param assetType
     * we can begin locating the file and we do so
     * in the following hierarchy:
     *
     * from the @type {CORE.FileAsset.SourceFolder}
     * we first check if the file is in the asset destination
     * if it's not then it needs either copying from
     * 1. local - fs.copy
     * 2. drive - fs.copy
     * 3. bucketIn - s3.download
     */
    private constructor(
        public fileName: string,
        public assetType: CORE.FileAsset.AssetType // public bucket: string = BUCKETS.incomingMedia
    ) {}
    /**
     * Static factory method to initialize a
     * @type {SeekFile} instance with async operations.
     */
    static async create(
        fileName: string,
        assetType: CORE.FileAsset.AssetType,
        edition: CORE.ECN_Edition,
        TD: TimeDeltas,
        renderMachine: DB.RenderMachine,
        bucketName: string = BUCKETS.incomingMedia
    ): Promise<SeekFile> {
        const instance = new SeekFile(fileName, assetType);

        const keys: CORE.FileAsset.SourceFolder[] = [
            'destination',
            'local',
            'drive',
            'bucketIn',
        ];

        for (const n in keys) {
            const key = keys[n] as CORE.FileAsset.SourceFolder;
            if (key in SeekFile.folderStructure[assetType]) {
                let path = instance.buildPath(
                    fileName,
                    assetType,
                    edition,
                    TD,
                    key
                );

                if (key === 'destination' || key === 'local')
                    path = renderMachine.local_storage_path + path;
                if (key === 'drive') path = renderMachine.drive_path + path;
                if (key === 'bucketIn')
                    path = `https://${bucketName}.s3.amazonaws.com/${path}`;
                instance[key] = path;
            }
        }

        const location: CORE.FileAsset.SourceFolder | null =
            await instance.getFileLocation();

        if (!instance.destination || instance.destination === null)
            throw `Failed to build destination path for ${instance.fileName}`;

        switch (location) {
            case 'destination':
                instance.location = instance.destination;
                return instance;
            case 'local':
                if (!instance.local || instance.local === null)
                    throw `File ${instance.fileName} not found in local`;

                fs.copyFileSync(instance.local, instance.destination);
                instance.location = instance.destination;

                // double check if the file was copied

                if (fs.existsSync(instance.destination)) return instance;
                throw `Failed to copy file ${instance.fileName} from local to destination`;
            case 'drive':
                if (!instance.drive || instance.drive === null)
                    throw `File ${instance.fileName} not found in drive`;

                fs.copyFileSync(instance.drive, instance.destination);
                instance.location = instance.destination;

                // double check if the file was copied
                if (fs.existsSync(instance.destination)) return instance;
                throw `Failed to copy file ${instance.fileName} from drive to destination`;
            case 'bucketIn':
                const bucket = new S3Bucket(bucketName, 'TOF');

                if (!instance.bucketIn || instance.bucketIn === null)
                    throw `File ${instance.fileName} not found in bucketIn`;

                const existsOnBucket = await bucket.checkIfFileExists(
                    instance.bucketIn
                );
                if (existsOnBucket) {
                    const base64File = await bucket.download(instance.bucketIn);
                    fs.writeFileSync(
                        instance.destination,
                        base64File,
                        'base64'
                    );

                    instance.location = instance.destination;

                    // double check if the file was copied
                    if (fs.existsSync(instance.destination)) return instance;
                    throw `Failed to copy file ${instance.fileName} from bucketIn to destination`;
                }
                return instance;
            default:
                throw `File ${instance.fileName} not found in any of the locations`;
        }
    }

    private buildPath(
        fileName: string,
        assetType: CORE.FileAsset.AssetType,
        edition: CORE.ECN_Edition,
        TD: TimeDeltas,
        key: CORE.FileAsset.SourceFolder
    ): string {
        let folderPath = SeekFile.folderStructure[assetType][key];
        if (!folderPath || folderPath === '' || folderPath === null)
            throw `No ${key} path found for ${assetType}`;
        if (!folderPath.endsWith('/')) folderPath += '/';

        const brandName = edition.editionName.replace(` ${edition.lang}`, '');

        const fullPath = `${folderPath}${fileName}`
            .replace('$EDITION_TYPE', TD.nowEdition)
            .replace('$EDITION_DATE_yyyymmdd', TD.editionDateYYYYMMDD)
            .replace('$EDITION_DATE_ddmmyy', TD.editionDateFormatted)
            .replace('$NARRATION_LANG_SHORT', edition.schemeName)
            .replace('$NARRATION_LANG', edition.langFolder)
            .replace('$LANG_SHORT_CODE', edition.schemeName)
            .replace('$BRAND_NAME', brandName);

        // console.log(`fullPath: ${fullPath}`);
        return fullPath;
    }

    async getFileLocation(): Promise<CORE.FileAsset.SourceFolder | null> {
        if (this.existsInDestination()) return 'destination';
        if (this.existsInLocal()) return 'local';
        if (this.existsInDrive()) return 'drive';
        if (await this.existsInBucketIn()) return 'bucketIn';
        return null;
    }
    private existsInDestination(): boolean {
        if (this.destination === null) return false;
        return fs.existsSync(this.destination);
    }
    private existsInLocal(): boolean {
        if (this.local === null) return false;
        return fs.existsSync(this.local);
    }
    private existsInDrive(): boolean {
        if (this.drive === null) return false;
        return fs.existsSync(this.drive);
    }
    private async existsInBucketIn(
        bucketName: string = BUCKETS.incomingMedia
    ): Promise<boolean> {
        const bucket = new S3Bucket(bucketName, 'TOF');
        if (this.bucketIn === null) return false;
        return bucket.checkIfFileExists(this.bucketIn);
    }
}
