import { ExportOptionsCoco } from "@labelflow/graphql-types";
import JSZip from "jszip";
import mime from "mime-types";

import { convertLabelflowDatasetToCocoDataset } from "./coco-core/converters";
import { jsonToDataUri } from "./json-to-data-uri";
import { ExportFunction } from "../types";
import { getImageName } from "../common";

import { addImageDimensionsToLabels } from "./add-image-dimensions-to-labels";

export const exportToCoco: ExportFunction = async (
  datasetId,
  options: ExportOptionsCoco = {},
  { repository }
) => {
  const images = await repository.image.list({ datasetId });
  const labelClasses = await repository.labelClass.list({ datasetId });
  const labels = await repository.label.list({ datasetId });

  const labelsWithImageDimensions = await addImageDimensionsToLabels(
    labels,
    repository
  );
  const annotationsFileJson = JSON.stringify(
    convertLabelflowDatasetToCocoDataset(
      images,
      labelsWithImageDimensions,
      labelClasses,
      options
    )
  );
  const annotationsFileDataUri = jsonToDataUri(annotationsFileJson);
  const datasetName = options?.name ?? "dataset-coco";
  if (options?.exportImages) {
    const zip = new JSZip();
    zip.file(
      `${datasetName}/annotations.json`,
      annotationsFileDataUri.substr(annotationsFileDataUri.indexOf(",") + 1),
      {
        base64: true,
      }
    );
    await Promise.all(
      images.map(async (image) => {
        const blob = new Blob([await repository.upload.get(image.url)], {
          type: image.mimetype,
        });
        zip.file(
          `${datasetName}/images/${getImageName(
            image,
            options?.avoidImageNameCollisions ?? false
          )}.${mime.extension(image.mimetype)}`,
          blob
        );
      })
    );
    const blobZip = await zip.generateAsync({ type: "blob" });
    return blobZip;
  }
  return new Blob([annotationsFileJson], { type: "application/json" });
};
