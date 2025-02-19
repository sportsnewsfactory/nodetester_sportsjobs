import {
    GetObjectCommand,
    GetObjectCommandInput,
    GetObjectCommandOutput,
    ListObjectsV2Command,
    ListObjectsV2CommandInput,
    S3Client,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { FileType, ThrowPolicy } from './types';
import { Progress, Upload } from '@aws-sdk/lib-storage';
import fs from 'fs';

export class S3Bucket {
    client: S3Client | null = null;
    uploadPercentage: number = 0;
    constructor(
        public bucketName: string,
        public throwPolicy: ThrowPolicy = 'WOF'
    ) {
        this.initClient();
    }
    initClient(): void {
        try {
            // Ensure AWS credentials are set
            if (
                !process.env.AWS_REGION ||
                !process.env.AWS_ACCESS_KEY_ID ||
                !process.env.AWS_SECRET_ACCESS_KEY
            ) {
                throw new Error('AWS credentials are not set');
            }

            /**
             * Initialize the @type {S3Client}
             * with the AWS credentials
             */
            const s3Client = new S3Client({
                region: process.env.AWS_REGION,
                credentials: {
                    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                },
                requestHandler: {
                    ...new S3Client({}).config.requestHandler,
                    socketTimeout: 300000, // Set the timeout to 5 minutes (300,000 ms)
                },
            });

            this.client = s3Client;
        } catch (e) {
            throw `Error initializing S3 client: ${e}`;
        }
    }
    /**
     * @returns a base64 string
     */
    async download(fileFullPath: string): Promise<string> {
        try {
            if (!this.client) throw `S3 client not initialized`;

            /**
             * Get the object from the S3 bucket
             * using the types:
             * @type {GetObjectCommandInput}
             * @type {GetObjectCommand}
             * @type {GetObjectCommandOutput}
             */
            const getObjCommantInput: GetObjectCommandInput = {
                Bucket: this.bucketName,
                Key: fileFullPath,
            };
            const command = new GetObjectCommand(getObjCommantInput);
            const response: GetObjectCommandOutput = await this.client.send(
                command
            );

            /**
             * Get the response.body as a @type {Readable}
             * and read the stream in chunks @type {Uint8Array}
             * and concatenate the chunks to a base64 @type {string}
             */
            const bufferEncoding: BufferEncoding = 'base64';
            const stream = response.Body as Readable;
            const chunks: Uint8Array[] = [];
            for await (let chunk of stream) {
                chunks.push(chunk);
            }
            const fileContent: string =
                Buffer.concat(chunks).toString(bufferEncoding);

            return fileContent;
        } catch (e) {
            throw `Error downloading file: ${e}`;
        }
    }
    async upload(
        fileFullPath: string,
        base64: string,
        fileType: FileType,
        progressMonitor?: Progress
    ) {
        try {
            if (!this.client) throw `S3 client not initialized`;

            if (fileFullPath.startsWith('/'))
                throw `File path cannot start with a '/'`;

            // Validate if fileName contains a folder structure
            this.validateFilePath(fileFullPath);

            // Extract the folder path (everything before the last '/')
            const folderPath = this.getFolderStructure(fileFullPath);

            // Check if the folder structure exists in the bucket
            switch (this.throwPolicy) {
                case 'TOF':
                    await this.checkFolderStructure__TOF(folderPath);
                    break;
                case 'WOF':
                    await this.checkFolderStructure__WOF(folderPath);
                    break;
                default:
                    throw `Invalid throw policy: ${this.throwPolicy}`;
            }

            const fileBuffer: Buffer = Buffer.from(base64, 'base64');

            const upload: Upload = new Upload({
                client: this.client,
                params: {
                    Bucket: this.bucketName,
                    Key: fileFullPath,
                    Body: fileBuffer,
                    ContentType: fileType,
                },
            });

            /**
             * Update the optional external progress monitor
             */
            if (progressMonitor)
                upload.on('httpUploadProgress', (progress) => {
                    progressMonitor = progress;
                    console.log(
                        `Progress: ${progress.loaded} / ${progress.total}`
                    );
                });

            await upload.done();
            console.log('File uploaded successfully.');

            const fileUrl = `https://${this.bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileFullPath}`;
            return fileUrl;
        } catch (e) {
            throw `Error uploading file: ${e}`;
        }
    }
    /**
     * @returns the URL of the uploaded file
     */
    async uploadStream(
        key: string,
        stream: fs.ReadStream | Readable, // NodeJS.ReadableStream, // Ensure this is Node.js stream
        fileType: FileType,
        // progress: Progress
    ): Promise<string> {
        if (!this.client) throw new Error(`S3 client not initialized`);

        const upload = new Upload({
            client: this.client,
            params: {
                Bucket: this.bucketName,
                Key: key,
                Body: stream, // Pass Node.js Readable stream directly
                ContentType: fileType,
            },
            leavePartsOnError: false,
            queueSize: 4, // Number of concurrent parts to upload
        });

        // Define a listener function
        const listenerFunction = (event: any) => {
            if (event.loaded) {
                // progress.loaded = event.loaded;
                this.uploadPercentage = (event.loaded / event.total) * 100;
                // console.log(
                //     `%cProgress: ${this.uploadPercentage.toFixed(2)}%`,
                //     'color: yellow'
                // );
            }
        };

        /**
         * And then use it in on and off methods:
         */
        upload.on('httpUploadProgress', listenerFunction);

        await upload.done();

        // Remove the listener after completion
        upload.off('httpUploadProgress', listenerFunction);

        return `https://${this.bucketName}.s3.amazonaws.com/${key}`;
    }

    startUploadLogInterval(intervalDuration: number = 5000): NodeJS.Timer {
        if (!this.client) throw `S3 client not initialized`;

        let previousPercentage = 0; // Store the last recorded percentage

        const logInterval = setInterval(() => {
            if (!this.uploadPercentage || this.uploadPercentage === 0) return;

            if (this.uploadPercentage === 100) {
                console.log('logInterval: Upload complete');
                clearInterval(logInterval);
                return;
            }

            // Check if the percentage has changed
            if (this.uploadPercentage === previousPercentage) {
                console.warn(
                    `%cUpload might be stuck! No progress in the last ${
                        intervalDuration / 1000
                    } seconds.`,
                    'color: red'
                );
            } else {
                console.log(
                    `%cProgress: ${this.uploadPercentage.toFixed(2)}%`,
                    'color: orange'
                );
            }

            // Update the previous percentage
            previousPercentage = this.uploadPercentage;
        }, intervalDuration);

        return logInterval;
    }

    // Check if the fileName contains a folder structure
    private validateFilePath(fullFilePath: string): void {
        if (!fullFilePath.includes('/')) {
            throw new Error(
                'File name must contain a folder structure (e.g., "folder/subfolder/file.txt").'
            );
        }
    }
    private getFolderStructure(fileName: string): string {
        return fileName.substring(0, fileName.lastIndexOf('/') + 1);
    }
    /**
     * Check if the folder structure exists in the bucket
     * and @throws an error if it does not exist (TOF)
     */
    private async checkFolderStructure__TOF(folderPath: string): Promise<void> {
        try {
            if (!this.client) throw `S3 client not initialized`;

            const params: ListObjectsV2CommandInput = {
                Bucket: this.bucketName,
                Prefix: folderPath,
                Delimiter: '/',
            };

            const command = new ListObjectsV2Command(params);
            const response = await this.client.send(command);

            if (
                !response.CommonPrefixes ||
                response.CommonPrefixes.length === 0
            ) {
                throw new Error(
                    `Folder structure "${folderPath}" does not exist in the bucket.`
                );
            }
        } catch (e) {
            throw `Error checking folder structure: ${e}`;
        }
    }

    /**
     * Check if the folder structure exists in the bucket
     * and only issues a warning if it does not exist (WOF)
     * but allows the upload to continue.
     */
    private async checkFolderStructure__WOF(folderPath: string): Promise<void> {
        try {
            if (!this.client) throw `S3 client not initialized`;

            const params: ListObjectsV2CommandInput = {
                Bucket: this.bucketName,
                Prefix: folderPath,
                Delimiter: '/',
            };

            const command = new ListObjectsV2Command(params);
            const response = await this.client.send(command);

            if (
                !response.CommonPrefixes ||
                response.CommonPrefixes.length === 0
            ) {
                console.warn(
                    `Folder structure "${folderPath}" does not exist in the bucket.`
                );
            }
        } catch (e) {
            throw `Error checking folder structure: ${e}`;
        }
    }

    async checkIfFileExists(fileFullPath: string): Promise<boolean> {
        try {
            if (!this.client) throw `S3 client not initialized`;

            const params: ListObjectsV2CommandInput = {
                Bucket: this.bucketName,
                Prefix: fileFullPath,
            };

            const command = new ListObjectsV2Command(params);
            const response = await this.client.send(command);

            if (response.Contents && response.Contents.length === 1) {
                return true;
            }

            return false;
        } catch (e) {
            throw `Error checking file existence: ${e}`;
        }
    }
}
