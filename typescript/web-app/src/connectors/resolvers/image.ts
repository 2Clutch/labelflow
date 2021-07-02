import { v4 as uuidv4 } from "uuid";
import probe from "probe-image-size";
import type {
  MutationCreateImageArgs,
  QueryImageArgs,
  QueryImagesArgs,
  Maybe,
} from "../../graphql-types.generated";

import { db, DbImage } from "../database";

import { uploadsCacheName, getUploadTarget } from "./upload";

const cachePromise = caches.open(uploadsCacheName);

export const getPaginatedImages = async (
  skip?: Maybe<number>,
  first?: Maybe<number>
): Promise<any[]> => {
  const query = db.image.orderBy("createdAt").offset(skip ?? 0);

  if (first) {
    return query.limit(first).toArray();
  }

  return query.toArray();
};

export const getLabelsByImageId = async (imageId: string) => {
  const getResults = await db.label.where({ imageId }).sortBy("createdAt");

  return getResults ?? [];
};

// Queries
export const labelsResolver = async ({ id }: DbImage) => {
  return getLabelsByImageId(id);
};

const image = async (_: any, args: QueryImageArgs) => {
  const entity = await db.image.get(args?.where?.id);
  if (entity === undefined) {
    throw new Error("No image with such id");
  }
  return entity;
};

const images = async (_: any, args: QueryImagesArgs) => {
  const imagesList = await getPaginatedImages(args?.skip, args?.first);

  const entitiesWithUrls = await Promise.all(
    imagesList.map(async (imageEntity: any) => {
      return {
        ...imageEntity,
      };
    })
  );

  return entitiesWithUrls;
};

/**
 * Given a partial image, return a completed version of the image, probing it if necessary
 */
const probeImage = async ({
  width,
  height,
  mimetype,
  url,
}: {
  width: number | null | undefined;
  height: number | null | undefined;
  mimetype: string | null | undefined;
  url: string;
}): Promise<{
  width: number;
  height: number;
  mimetype: string;
}> => {
  if (width && height && mimetype) {
    return { width, height, mimetype };
  }

  try {
    console.log("yoyo1");
    // const probe = await import(/* webpackPrefetch: true */ "probe-image-size");
    console.log("yoyo2", url, await cachePromise);

    const cacheResult = await (await cachePromise).match(url);
    console.log("cacheResult", cacheResult);
    const fetchResult =
      cacheResult ??
      (await fetch(url, {
        method: "GET",
        mode: "cors",
        headers: new Headers({
          Accept: "image/tiff,image/jpeg,image/png,image/*,*/*;q=0.8",
          "Sec-Fetch-Dest": "image",
        }),
        credentials: "omit",
      }));
    console.log("yoyo3", fetchResult);
    if (fetchResult.status !== 200) {
      throw new Error(
        `Could not fetch image at url ${url} properly, code ${fetchResult.status}`
      );
    }
    const blob = await fetchResult.blob();
    console.log("yoyo4");
    const probeInput = new Uint8Array(await blob.arrayBuffer());
    console.log("yoyo5");
    const probeResult = probe.sync(probeInput as Buffer);
    console.log("yoyo6", probeResult);
    if (probeResult == null) {
      throw new Error(
        `Could not probe the external image at url ${url} it may be damaged or corrupted.`
      );
    }

    return {
      width: width ?? probeResult.width,
      height: height ?? probeResult.height,
      mimetype: mimetype ?? probeResult.mime,
    };
  } catch (e) {
    console.error(e);
    throw e;
  }
};

// Mutations
const createImage = async (
  _: any,
  args: MutationCreateImageArgs
): Promise<DbImage> => {
  const { file, id, name, height, width, mimetype, path, url, externalUrl } =
    args.data;
  const now = args?.data?.createdAt ?? new Date().toISOString();
  const imageId = id ?? uuidv4();
  let finalUrl: string | undefined;
  console.log("create Image", args.data);
  if (
    !(
      (!file && !externalUrl && url) ||
      (!file && externalUrl && !url) ||
      (file && !externalUrl && !url)
    )
  ) {
    console.log("file,externalUrl,url", file, externalUrl, url);
    throw new Error(
      "Image creation upload must include either a `file` field of type `Upload`, or a `url` field of type `String`, or a `externalUrl` field of type `String`"
    );
  }

  if (!file && !externalUrl && url) {
    // No File Upload
    finalUrl = url;
  }

  if (!file && externalUrl && !url) {
    // External file based upload
    console.log("External file based upload", externalUrl);
    const fetchResult = await fetch(externalUrl, {
      method: "GET",
      mode: "cors",
      headers: new Headers({
        Accept: "image/tiff,image/jpeg,image/png,image/*,*/*;q=0.8",
        "Sec-Fetch-Dest": "image",
      }),
      credentials: "omit",
    });

    console.log("External file based upload 2 ", externalUrl);

    if (fetchResult.status !== 200) {
      throw new Error(
        `Could not fetch image at url ${url} properly, code ${fetchResult.status}`
      );
    }

    console.log("External file based upload3", fetchResult);
    const uploadTarget = await getUploadTarget();
    console.log("External file based upload4", uploadTarget);

    // eslint-disable-next-line no-underscore-dangle
    if (uploadTarget.__typename !== "UploadTargetHttp") {
      throw new Error(
        "This Server does not support file upload. You can create images by providing a `file` directly in the `createImage` mutation"
      );
    }
    console.log("External file based upload5", uploadTarget);
    finalUrl = uploadTarget.downloadUrl;

    console.log("External file based upload6", uploadTarget);

    const responseOfGet = new Response(await fetchResult.blob(), {
      status: 200,
      statusText: "OK",
      headers: new Headers({
        "Content-Type":
          fetchResult.headers.get("Content-Type") ?? "application/octet-stream",
        "Content-Length": fetchResult.headers.get("Content-Length") ?? "0",
      }),
    });

    await (await cachePromise).put(finalUrl, responseOfGet);

    console.log("External file based upload7", uploadTarget);
  }

  if (file && !externalUrl && !url) {
    // File Content based upload

    const uploadTarget = await getUploadTarget();

    // eslint-disable-next-line no-underscore-dangle
    if (uploadTarget.__typename !== "UploadTargetHttp") {
      throw new Error(
        "This Server does not support file upload. You can create images by providing a `file` directly in the `createImage` mutation"
      );
    }
    finalUrl = uploadTarget.downloadUrl;

    const response = new Response(file, {
      status: 200,
      statusText: "OK",
      headers: new Headers({
        "Content-Type": file.type ?? "application/octet-stream",
        "Content-Length": file.size.toString() ?? "0",
      }),
    });

    await (await cachePromise).put(finalUrl, response);
  }

  console.log("ok1");
  // Probe the file to get its dimensions and mimetype if not provided
  const imageMetaData = await probeImage({
    width,
    height,
    mimetype,
    url: finalUrl!,
  });
  console.log("ok2");

  const newImageEntity: DbImage = {
    createdAt: now,
    updatedAt: now,
    id: imageId,
    url: finalUrl!,
    externalUrl,
    path: path ?? externalUrl!,
    name:
      name ??
      externalUrl!.substring(
        externalUrl!.lastIndexOf("/") + 1,
        externalUrl!.indexOf("?")
      ),
    ...imageMetaData,
  };

  await db.image.add(newImageEntity);

  return newImageEntity;
};

const imagesAggregates = () => {
  return {};
};

const totalCount = () => {
  return db.image.count();
};

export default {
  Query: {
    image,
    images,
    imagesAggregates,
  },

  Mutation: {
    createImage,
  },

  Image: {
    labels: labelsResolver,
  },

  ImagesAggregates: { totalCount },
};
