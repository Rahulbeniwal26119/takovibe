import ImageKit from "imagekit";
import { Buffer } from "node:buffer";

const imagekit = new ImageKit({
    publicKey: import.meta.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: import.meta.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: import.meta.env.IMAGEKIT_URL_ENDPOINT,
});

export const uploadImage = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return new Promise((resolve, reject) => {
        imagekit.upload({
            file: buffer,
            fileName: file.name,
            useUniqueFileName: true,
        }, (error, result) => {
            if (error) reject(error);
            else resolve(result);
        });
    });
};
