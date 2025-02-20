import fs from "fs";
import { MYSQL_DB } from "../../../../classes/MYSQL_DB";
import { BUCKETS } from "../../../../config/BUCKETS";
import { AE } from "../../../../types/AE";
import { CORE } from "../../../../types/CORE";
import { S3Bucket } from "../../../../V2/classes/AWS/S3Bucket";
import updateJob from "../../db/updateJob";
import getProduct from "../../get/product";

export default async function uploadSingleJob(
    SportsDB: MYSQL_DB,
    qaReadyJob: AE.Job,
    targetDateString: string,
    newStatus: CORE.Keys.JobStatus,
    qa: boolean = false
) {
    const funcName: string = "uploadSingleJob";

    try {
        const product: CORE.Product = await getProduct(
            SportsDB,
            qaReadyJob.product_name
        );

        const brandPath = `Z:/Studio/Sports/S_Brands/${qaReadyJob.brand_name}`;
        const productFolder = product.product_path.replace(
            "$brand_path",
            brandPath
        );
        const exportsFolder = `${productFolder}exports/`;
        
        const productFileName = product.product_name === "AE_Daily_News" 
            ? `${qaReadyJob.brand_name} ${qaReadyJob.lang} ${targetDateString}.mp4`
            : `${qaReadyJob.brand_name} SNS-news ${qaReadyJob.lang} ${targetDateString}.mp4`;

        const expectedExportPath = `${exportsFolder}${productFileName}`;

        if (fs.existsSync(expectedExportPath)) {
            console.log(`Export found at ${expectedExportPath}`);

            const qaUploadPath = `QA/${qaReadyJob.lang}/${targetDateString}.mp4`;
            const clientUploadPath = `UPLOADS/${qaReadyJob.brand_name}/${qaReadyJob.lang}/${product.aws_folder_name}/${targetDateString}/video.mp4`;

            const uploadPath = qa ? qaUploadPath : clientUploadPath;

            const bucket = new S3Bucket(BUCKETS.sportsOutgoingMedia, "WOF");
            const stream: fs.ReadStream =
                fs.createReadStream(expectedExportPath);

            const uploadResult: string = await bucket.uploadStream(
                uploadPath,
                stream,
                "video/mp4"
            );

            console.log(`%cuploadResult: ${uploadResult}`, "color: yellow");

            await updateJob({
                SportsDB,
                nextJob: qaReadyJob,
                log: "",
                newStatus,
                dateString: targetDateString,
            });
        } else {
            throw `Export not found at ${expectedExportPath}`;
        }
    } catch (e) {
        throw `${funcName}: ${e}`;
    }
}
